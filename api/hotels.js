export default async function handler(req, res) {

    /* =================================================
       CORS
    ================================================= */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    /* =================================================
       PREFLIGHT
    ================================================= */

    if (req.method === "OPTIONS") {

        return res.status(200).json({
            success: true
        });

    }


    /* =================================================
       METHOD CHECK
    ================================================= */

    if (
        req.method !== "GET" &&
        req.method !== "POST"
    ) {

        return res.status(405).json({

            success: false,

            error: "Method not allowed"

        });

    }


    try {

        console.log(
            "REQUEST:",
            req.method,
            req.query,
            req.body
        );


        /* =================================================
           INPUT
        ================================================= */

        const input =
            req.method === "GET"
                ? req.query?.input
                : req.body?.input;


        const action =
            req.method === "GET"
                ? req.query?.action
                : req.body?.action;


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
            action === "details"
        ) {

            const propertyToken =
                req.query?.property_token ||
                req.body?.property_token;


            if (!propertyToken) {

                return res.status(400).json({

                    success: false,

                    error:
                        "property_token is required"

                });

            }


            const serpURL =
                new URL(
                    "https://serpapi.com/search"
                );


            serpURL.searchParams.set(
                "engine",
                "google_hotels"
            );


            serpURL.searchParams.set(
                "property_token",
                propertyToken
            );


            serpURL.searchParams.set(
                "api_key",
                process.env.SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpURL
                );


            const data =
                await response.json();


            console.log(
                "HOTEL DETAILS RESPONSE:",
                data
            );


            return res.status(200).json({

                success: true,

                hotel: data

            });

        }


        /* =================================================
           HOTEL REVIEWS
        ================================================= */

        if (
            action === "reviews"
        ) {

            const propertyToken =
                req.query?.property_token ||
                req.body?.property_token;


            if (!propertyToken) {

                return res.status(400).json({

                    success: false,

                    error:
                        "property_token is required"

                });

            }


            const serpURL =
                new URL(
                    "https://serpapi.com/search"
                );


            serpURL.searchParams.set(
                "engine",
                "google_hotels"
            );


            serpURL.searchParams.set(
                "property_token",
                propertyToken
            );


            serpURL.searchParams.set(
                "api_key",
                process.env.SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpURL
                );


            const data =
                await response.json();


            const property =
                data.property ||
                data;


            return res.status(200).json({

                success: true,

                overall_rating:
                    property.overall_rating ||
                    0,

                total_reviews:
                    property.reviews ||
                    0,

                reviews:
                    property.reviews ||
                    []

            });

        }


        /* =================================================
           HOTEL SEARCH
        ================================================= */

        const inputData =
            req.method === "GET"
                ? req.query
                : req.body;


        const destination =
            inputData?.destination;


        const checkIn =
            inputData?.check_in;


        const checkOut =
            inputData?.check_out;


        const rooms =
            Number(
                inputData?.rooms
            ) || 1;


        const adults =
            Number(
                inputData?.adults
            ) || 1;


        const children =
            Number(
                inputData?.children
            ) || 0;


        const seniors =
            Number(
                inputData?.seniors
            ) || 0;


        /* =================================================
           VALIDATION
        ================================================= */

        if (!destination) {

            return res.status(400).json({

                success: false,

                error:
                    "destination is required"

            });

        }


        if (!checkIn) {

            return res.status(400).json({

                success: false,

                error:
                    "check_in is required"

            });

        }


        if (!checkOut) {

            return res.status(400).json({

                success: false,

                error:
                    "check_out is required"

            });

        }


        /* =================================================
           SERPAPI HOTEL SEARCH
        ================================================= */

        async function fetchHotels(
            pageToken = null
        ) {

            const serpURL =
                new URL(
                    "https://serpapi.com/search"
                );


            serpURL.searchParams.set(
                "engine",
                "google_hotels"
            );


            serpURL.searchParams.set(
                "q",
                destination
            );


            serpURL.searchParams.set(
                "check_in_date",
                checkIn
            );


            serpURL.searchParams.set(
                "check_out_date",
                checkOut
            );


            serpURL.searchParams.set(
                "adults",
                adults
            );


            serpURL.searchParams.set(
                "children",
                children
            );


            serpURL.searchParams.set(
                "rooms",
                rooms
            );


            if (pageToken) {

                serpURL.searchParams.set(
                    "next_page_token",
                    pageToken
                );

            }


            serpURL.searchParams.set(
                "api_key",
                process.env.SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpURL
                );


            if (!response.ok) {

                throw new Error(
                    `SerpAPI returned ${response.status}`
                );

            }


            return await response.json();

        }


        /* =================================================
           GET ALL HOTEL PAGES
        ================================================= */

        let allHotels = [];


        let data =
            await fetchHotels();


        console.log(
            "FIRST SERPAPI RESPONSE:",
            data
        );


        if (
            Array.isArray(
                data.properties
            )
        ) {

            allHotels.push(
                ...data.properties
            );

        }


        let nextPageToken =
            data.serpapi_pagination
                ?.next_page_token;


        let page = 0;


        while (
            nextPageToken &&
            page < 5
        ) {

            const nextData =
                await fetchHotels(
                    nextPageToken
                );


            if (
                Array.isArray(
                    nextData.properties
                )
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


        /* =================================================
           REMOVE DUPLICATES
        ================================================= */

        const uniqueHotels =
            new Map();


        allHotels.forEach(
            hotel => {

                const key =
                    hotel.property_token ||
                    hotel.name;


                if (
                    key &&
                    !uniqueHotels.has(key)
                ) {

                    uniqueHotels.set(
                        key,
                        hotel
                    );

                }

            }
        );


        allHotels =
            Array.from(
                uniqueHotels.values()
            );


        /* =================================================
           FILTER HOTELS
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
                                                "places.formattedAddress,places.id"

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

                            }

                        }
                        catch (error) {

                            console.error(
                                "GOOGLE PLACE ERROR:",
                                error.message
                            );

                        }


                        return hotel;

                    }
                )

            );


        /* =================================================
           RETURN RESULTS
        ================================================= */

        console.log(
            "FINAL HOTEL COUNT:",
            hotelsWithAddresses.length
        );


        return res.status(200).json({

            success: true,

            destination:
                destination,

            check_in:
                checkIn,

            check_out:
                checkOut,

            properties:
                hotelsWithAddresses

        });

    }
    catch (error) {

        console.error(
            "HOTEL BACKEND ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                "Hotel search failed",

            details:
                error.message

        });

    }

}
