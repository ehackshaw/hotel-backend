export default async function handler(req, res) {

    /* =====================================================
       CORS
    ===================================================== */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, GET, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    /* =====================================================
       PREFLIGHT
    ===================================================== */

    if (req.method === "OPTIONS") {

        return res.status(200).json({
            success: true
        });

    }


    /* =====================================================
       METHOD CHECK
    ===================================================== */

    if (
        req.method !== "POST" &&
        req.method !== "GET"
    ) {

        return res.status(405).json({

            success: false,

            error: "Method not allowed",

            method: req.method

        });

    }


    try {

        console.log(
            "REQUEST METHOD:",
            req.method
        );


        console.log(
            "REQUEST BODY:",
            req.body
        );


        console.log(
            "REQUEST QUERY:",
            req.query
        );


        /* =================================================
           INPUT
        ================================================= */

        const input =
            req.method === "GET"
                ? req.query.input
                : req.body?.input;


        const body =
            req.method === "POST"
                ? req.body || {}
                : req.query;


        const {

            destination,

            check_in,

            check_out,

            rooms = 1,

            adults = 1,

            children = 0,

            seniors = 0,

            action = "search",

            property_token,

            next_page_token

        } = body;


        /* =================================================
           GOOGLE DESTINATION AUTOCOMPLETE
        ================================================= */

        if (input) {

            const googleURL =
                new URL(
                    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
                );


            googleURL.searchParams.set(
                "input",
                input
            );


            googleURL.searchParams.set(
                "key",
                process.env.GOOGLE_PLACES_KEY
            );


            googleURL.searchParams.set(
                "types",
                "(regions)"
            );


            const response =
                await fetch(
                    googleURL
                );


            const data =
                await response.json();


            return res.status(200).json(
                data
            );

        }


        /* =================================================
           HOTEL DETAILS
        ================================================= */

        if (
            action === "details" &&
            property_token
        ) {

            return await getHotelDetails({

                propertyToken:
                    property_token,

                checkIn:
                    check_in,

                checkOut:
                    check_out,

                adults,

                children,

                rooms,

                res

            });

        }


        /* =================================================
           HOTEL REVIEWS
        ================================================= */

        if (
            action === "reviews" &&
            property_token
        ) {

            return await getHotelReviews({

                propertyToken:
                    property_token,

                res

            });

        }


        /* =================================================
           HOTEL PHOTOS
        ================================================= */

        if (
            action === "photos" &&
            property_token
        ) {

            return await getHotelPhotos({

                propertyToken:
                    property_token,

                res

            });

        }


        /* =================================================
           VALIDATE HOTEL SEARCH
        ================================================= */

        if (!destination) {

            return res.status(400).json({

                success: false,

                error:
                    "Missing destination."

            });

        }


        if (!check_in) {

            return res.status(400).json({

                success: false,

                error:
                    "Missing check-in date."

            });

        }


        if (!check_out) {

            return res.status(400).json({

                success: false,

                error:
                    "Missing check-out date."

            });

        }


        /* =================================================
           SERPAPI HOTEL SEARCH
        ================================================= */

        async function fetchHotels(
            pageToken = null
        ) {

            const serpUrl =
                new URL(
                    "https://serpapi.com/search"
                );


            serpUrl.searchParams.set(
                "engine",
                "google_hotels"
            );


            serpUrl.searchParams.set(
                "q",
                destination
            );


            serpUrl.searchParams.set(
                "check_in_date",
                check_in
            );


            serpUrl.searchParams.set(
                "check_out_date",
                check_out
            );


            serpUrl.searchParams.set(
                "adults",
                adults || 1
            );


            serpUrl.searchParams.set(
                "children",
                children || 0
            );


            serpUrl.searchParams.set(
                "rooms",
                rooms || 1
            );


            serpUrl.searchParams.set(
                "currency",
                "USD"
            );


            serpUrl.searchParams.set(
                "hl",
                "en"
            );


            serpUrl.searchParams.set(
                "gl",
                "us"
            );


            if (pageToken) {

                serpUrl.searchParams.set(
                    "next_page_token",
                    pageToken
                );

            }


            serpUrl.searchParams.set(
                "api_key",
                process.env.SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpUrl
                );


            const data =
                await response.json();


            return data;

        }


        /* =================================================
           COLLECT ALL HOTEL PAGES
        ================================================= */

        let allHotels = [];


        /* =================================================
           FIRST PAGE
        ================================================= */

        let data =
            await fetchHotels();


        console.log(
            "FIRST SERP DATA:",
            data
        );


        if (data.properties) {

            allHotels.push(
                ...data.properties
            );

        }


        let nextPageToken =
            data
                .serpapi_pagination
                ?.next_page_token;


        let page = 0;


        /* =================================================
           ADDITIONAL PAGES
        ================================================= */

        while (
            nextPageToken &&
            page < 5
        ) {

            const nextData =
                await fetchHotels(
                    nextPageToken
                );


            console.log(
                `SERP PAGE ${page + 2}:`,
                nextData
            );


            if (
                nextData.properties
            ) {

                allHotels.push(
                    ...nextData.properties
                );

            }


            nextPageToken =
                nextData
                    .serpapi_pagination
                    ?.next_page_token;


            page++;

        }


        console.log(
            "TOTAL HOTELS FOUND:",
            allHotels.length
        );


        /* =================================================
           REMOVE DUPLICATES
        ================================================= */

        const hotelMap =
            new Map();


        allHotels.forEach(
            hotel => {

                const key =
                    hotel.property_token ||
                    hotel.name;


                if (
                    key &&
                    !hotelMap.has(key)
                ) {

                    hotelMap.set(
                        key,
                        hotel
                    );

                }

            }
        );


        allHotels =
            Array.from(
                hotelMap.values()
            );


        /* =================================================
           REMOVE HOTELS WITHOUT IMAGE OR PRICE
        ================================================= */

        allHotels =
            allHotels.filter(
                hotel => {

                    const hasImage =
                        hotel.images &&
                        hotel.images.length > 0;


                    const hasPrice =
                        hotel.rate_per_night?.lowest ||
                        hotel.total_rate?.lowest ||
                        hotel.rate_per_night?.extracted_lowest;


                    return (
                        hasImage &&
                        hasPrice
                    );

                }
            );


        console.log(
            "FILTERED HOTELS:",
            allHotels.length
        );


        /* =================================================
           GOOGLE PLACES ADDRESS LOOKUP
        ================================================= */

        const hotelsWithAddresses =
            await Promise.all(

                allHotels.map(
                    async hotel => {

                        try {

                            const placeResponse =
                                await fetch(

                                    "https://places.googleapis.com/v1/places:searchText",

                                    {

                                        method:
                                            "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json",

                                            "X-Goog-Api-Key":
                                                process.env.GOOGLE_PLACES_KEY,

                                            "X-Goog-FieldMask":
                                                "places.displayName,places.formattedAddress,places.id,places.location"

                                        },

                                        body:
                                            JSON.stringify({

                                                textQuery:
                                                    `${hotel.name} ${destination}`

                                            })

                                    }

                                );


                            const placeData =
                                await placeResponse.json();


                            if (
                                placeData.places &&
                                placeData.places.length
                            ) {

                                const place =
                                    placeData.places[0];


                                hotel.address =
                                    place.formattedAddress;


                                hotel.google_place_id =
                                    place.id;


                                hotel.maps_url =
                                    `https://www.google.com/maps/place/?q=place_id:${place.id}`;


                                if (
                                    place.location
                                ) {

                                    hotel.google_coordinates = {

                                        latitude:
                                            place.location.latitude,

                                        longitude:
                                            place.location.longitude

                                    };

                                }

                            }

                        }
                        catch (error) {

                            console.log(
                                "GOOGLE PLACE ERROR:",
                                error.message
                            );

                        }


                        return hotel;

                    }

                )

            );


        /* =================================================
           FINAL RESPONSE
        ================================================= */

        return res.status(200).json({

            success: true,

            destination,

            check_in,

            check_out,

            rooms:

                Number(rooms) || 1,

            adults:

                Number(adults) || 1,

            children:

                Number(children) || 0,

            seniors:

                Number(seniors) || 0,

            total_results:
                hotelsWithAddresses.length,

            properties:
                hotelsWithAddresses

        });


    }
    catch (error) {

        console.error(
            "HOTEL API ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                "Hotel search failed.",

            details:
                error.message

        });

    }

}


/* =========================================================
   HOTEL DETAILS
========================================================= */

async function getHotelDetails({

    propertyToken,

    checkIn,

    checkOut,

    adults,

    children,

    rooms,

    res

}) {

    try {

        const url =
            new URL(
                "https://serpapi.com/search"
            );


        url.searchParams.set(
            "engine",
            "google_hotels"
        );


        url.searchParams.set(
            "property_token",
            propertyToken
        );


        url.searchParams.set(
            "api_key",
            process.env.SERPAPI_KEY
        );


        if (checkIn) {

            url.searchParams.set(
                "check_in_date",
                checkIn
            );

        }


        if (checkOut) {

            url.searchParams.set(
                "check_out_date",
                checkOut
            );

        }


        url.searchParams.set(
            "adults",
            adults || 1
        );


        url.searchParams.set(
            "children",
            children || 0
        );


        url.searchParams.set(
            "rooms",
            rooms || 1
        );


        url.searchParams.set(
            "currency",
            "USD"
        );


        const response =
            await fetch(url);


        const data =
            await response.json();


        if (
            data.error
        ) {

            return res.status(500).json({

                success: false,

                error:
                    data.error

            });

        }


        return res.status(200).json({

            success: true,

            hotel: data

        });

    }
    catch (error) {

        return res.status(500).json({

            success: false,

            error:
                error.message

        });

    }

}


/* =========================================================
   HOTEL REVIEWS
========================================================= */

async function getHotelReviews({

    propertyToken,

    res

}) {

    try {

        const url =
            new URL(
                "https://serpapi.com/search"
            );


        url.searchParams.set(
            "engine",
            "google_hotels_reviews"
        );


        url.searchParams.set(
            "property_token",
            propertyToken
        );


        url.searchParams.set(
            "api_key",
            process.env.SERPAPI_KEY
        );


        const response =
            await fetch(url);


        const data =
            await response.json();


        if (
            data.error
        ) {

            return res.status(500).json({

                success: false,

                error:
                    data.error

            });

        }


        return res.status(200).json({

            success: true,

            reviews:
                data.reviews || [],

            overall_rating:
                data.overall_rating || null,

            total_reviews:
                data.total_reviews || 0

        });

    }
    catch (error) {

        return res.status(500).json({

            success: false,

            error:
                error.message

        });

    }

}


/* =========================================================
   HOTEL PHOTOS
========================================================= */

async function getHotelPhotos({

    propertyToken,

    res

}) {

    try {

        const url =
            new URL(
                "https://serpapi.com/search"
            );


        url.searchParams.set(
            "engine",
            "google_hotels_photos"
        );


        url.searchParams.set(
            "property_token",
            propertyToken
        );


        url.searchParams.set(
            "api_key",
            process.env.SERPAPI_KEY
        );


        const response =
            await fetch(url);


        const data =
            await response.json();


        if (
            data.error
        ) {

            return res.status(500).json({

                success: false,

                error:
                    data.error

            });

        }


        return res.status(200).json({

            success: true,

            photos:
                data.photos || [],

            sections:
                data.sections || []

        });

    }
    catch (error) {

        return res.status(500).json({

            success: false,

            error:
                error.message

        });

    }

}
