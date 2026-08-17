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

        const inputData =
            req.method === "GET"
                ? req.query || {}
                : req.body || {};


        const action =
            inputData.action || "";


        /* =================================================
           ENVIRONMENT VARIABLES
        ================================================= */

        const SERPAPI_KEY =
            process.env.SERPAPI_KEY;

        const GOOGLE_PLACES_API_KEY =
            process.env.GOOGLE_PLACES_API_KEY;


        if (!SERPAPI_KEY) {

            return res.status(500).json({

                success: false,

                error:
                    "SERPAPI_KEY is not configured in Vercel."

            });

        }


        if (!GOOGLE_PLACES_API_KEY) {

            return res.status(500).json({

                success: false,

                error:
                    "GOOGLE_PLACES_API_KEY is not configured in Vercel."

            });

        }


        console.log(
            "================================="
        );

        console.log(
            "BOKKARA HOTEL BACKEND"
        );

        console.log(
            "ACTION:",
            action || "SEARCH"
        );

        console.log(
            "================================="
        );


        /* =================================================
           GOOGLE PLACES SEARCH
           
           Find the actual Google Place for a hotel.
        ================================================= */

        async function findGooglePlace(
            hotel
        ) {

            const hotelName =
                hotel?.name ||
                "";

            const hotelAddress =
                hotel?.address ||
                hotel?.formatted_address ||
                hotel?.location ||
                "";


            if (!hotelName) {

                return null;

            }


            const query =
                hotelAddress
                    ? `${hotelName}, ${hotelAddress}`
                    : hotelName;


            console.log(
                "GOOGLE PLACES SEARCH:",
                query
            );


            const response =
                await fetch(
                    "https://places.googleapis.com/v1/places:searchText",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "X-Goog-Api-Key":
                                GOOGLE_PLACES_API_KEY,

                            "X-Goog-FieldMask":
                                [
                                    "places.id",
                                    "places.name",
                                    "places.displayName",
                                    "places.formattedAddress",
                                    "places.shortFormattedAddress",
                                    "places.location",
                                    "places.rating",
                                    "places.userRatingCount",
                                    "places.websiteUri",
                                    "places.nationalPhoneNumber",
                                    "places.internationalPhoneNumber",
                                    "places.types",
                                    "places.primaryType",
                                    "places.primaryTypeDisplayName",
                                    "places.googleMapsUri",
                                    "places.photos",
                                    "places.editorialSummary",
                                    "places.regularOpeningHours"
                                ].join(",")

                        },

                        body:
                            JSON.stringify({

                                textQuery:
                                    query,

                                languageCode:
                                    "en",

                                maxResultCount:
                                    5

                            })

                    }
                );


            const data =
                await response.json();


            console.log(
                "GOOGLE PLACES STATUS:",
                response.status
            );


            if (!response.ok) {

                console.error(
                    "GOOGLE PLACES ERROR:",
                    data
                );

                return null;

            }


            const places =
                Array.isArray(data?.places)
                    ? data.places
                    : [];


            if (!places.length) {

                return null;

            }


            /*
               Prefer a result that looks like
               the actual hotel.
            */

            const hotelTypes = new Set([

                "lodging",
                "hotel",
                "resort_hotel",
                "motel",
                "hostel",
                "bed_and_breakfast",
                "inn"

            ]);


            const hotelPlace =
                places.find(
                    place =>
                        Array.isArray(place.types) &&
                        place.types.some(
                            type =>
                                hotelTypes.has(type)
                        )
                ) ||
                places[0];


            return hotelPlace;

        }


        /* =================================================
           GOOGLE PLACE DETAILS
           
           Retrieve complete Google Places information.
        ================================================= */

        async function getGooglePlaceDetails(
            placeId
        ) {

            if (!placeId) {

                return null;

            }


            const url =
                new URL(
                    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
                );


            const fieldMask = [

                "id",
                "name",
                "displayName",
                "formattedAddress",
                "shortFormattedAddress",
                "location",
                "rating",
                "userRatingCount",
                "websiteUri",
                "nationalPhoneNumber",
                "internationalPhoneNumber",
                "googleMapsUri",
                "types",
                "primaryType",
                "primaryTypeDisplayName",
                "photos",
                "editorialSummary",
                "regularOpeningHours"

            ];


            const response =
                await fetch(
                    url,
                    {

                        headers: {

                            "X-Goog-Api-Key":
                                GOOGLE_PLACES_API_KEY,

                            "X-Goog-FieldMask":
                                fieldMask.join(",")

                        }

                    }
                );


            const data =
                await response.json();


            console.log(
                "GOOGLE PLACE DETAILS STATUS:",
                response.status
            );


            if (!response.ok) {

                console.error(
                    "GOOGLE PLACE DETAILS ERROR:",
                    data
                );

                return null;

            }


            return data;

        }


        /* =================================================
           GOOGLE PLACE PHOTO URL
           
           Google Places photo resources are returned as
           photo resource names. Convert them to usable
           image URLs.
        ================================================= */

        function buildGooglePhotoUrl(
            photoName
        ) {

            if (!photoName) {

                return "";

            }


            return (
                "https://places.googleapis.com/v1/" +
                photoName +
                "/media" +
                "?maxWidthPx=1600" +
                "&maxHeightPx=1200" +
                "&key=" +
                encodeURIComponent(
                    GOOGLE_PLACES_API_KEY
                )
            );

        }


        /* =================================================
           NORMALIZE GOOGLE PLACE
        ================================================= */

        function normalizeGooglePlace(
            place
        ) {

            if (!place) {

                return null;

            }


            const photos =
                Array.isArray(place.photos)
                    ? place.photos
                    : [];


            const photoUrls =
                photos
                    .map(
                        photo =>
                            buildGooglePhotoUrl(
                                photo.name
                            )
                    )
                    .filter(Boolean);


            const editorialSummary =
                place.editorialSummary?.text ||
                "";


            return {

                google_place_id:
                    place.id || "",


                name:
                    place.displayName?.text ||
                    "",


                address:
                    place.formattedAddress ||
                    "",


                short_address:
                    place.shortFormattedAddress ||
                    "",


                phone:
                    place.nationalPhoneNumber ||
                    place.internationalPhoneNumber ||
                    "",


                website:
                    place.websiteUri ||
                    "",


                google_maps_url:
                    place.googleMapsUri ||
                    "",


                rating:
                    place.rating ??
                    0,


                overall_rating:
                    place.rating ??
                    0,


                review_count:
                    place.userRatingCount ??
                    0,


                reviews_count:
                    place.userRatingCount ??
                    0,


                description:
                    editorialSummary,


                editorial_summary:
                    editorialSummary,


                types:
                    Array.isArray(place.types)
                        ? place.types
                        : [],


                primary_type:
                    place.primaryType ||
                    "",


                primary_type_name:
                    place.primaryTypeDisplayName?.text ||
                    "",


                gps_coordinates:
                    place.location
                        ? {
                            latitude:
                                place.location.latitude,

                            longitude:
                                place.location.longitude
                        }
                        : null,


                latitude:
                    place.location?.latitude ??
                    null,


                longitude:
                    place.location?.longitude ??
                    null,


                photos:
                    photoUrls.map(
                        url => ({
                            original_image:
                                url,

                            thumbnail:
                                url
                        })
                    ),


                regular_opening_hours:
                    place.regularOpeningHours ||
                    null

            };

        }


        /* =================================================
           HOTEL DETAILS
           
           Google Places is now the primary source.
        ================================================= */

        if (
            action === "details"
        ) {

            const propertyToken =
                inputData.property_token;


            const googlePlaceId =
                inputData.google_place_id;


            /*
               Preferred:
               Google Place ID.
            */

            if (googlePlaceId) {

                const place =
                    await getGooglePlaceDetails(
                        googlePlaceId
                    );


                if (!place) {

                    return res.status(404).json({

                        success: false,

                        error:
                            "Google Place was not found."

                    });

                }


                return res.status(200).json({

                    success: true,

                    hotel:
                        normalizeGooglePlace(
                            place
                        )

                });

            }


            /*
               Backward compatibility:
               If the frontend only has property_token,
               use SerpAPI once to identify the hotel,
               then Google Places becomes the source
               of the actual details.
            */

            if (!propertyToken) {

                return res.status(400).json({

                    success: false,

                    error:
                        "google_place_id or property_token is required."

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
                SERPAPI_KEY
            );


            const serpResponse =
                await fetch(
                    serpURL
                );


            const serpData =
                await serpResponse.json();


            if (
                !serpResponse.ok ||
                serpData.error
            ) {

                return res.status(500).json({

                    success: false,

                    error:
                        serpData.error ||
                        "Unable to identify hotel."

                });

            }


            const serpHotel =
                serpData.property ||
                serpData;


            const googlePlace =
                await findGooglePlace(
                    serpHotel
                );


            if (!googlePlace) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Google Places could not find this hotel."

                });

            }


            const googleDetails =
                await getGooglePlaceDetails(
                    googlePlace.id
                );


            const hotel =
                normalizeGooglePlace(
                    googleDetails ||
                    googlePlace
                );


            return res.status(200).json({

                success: true,

                hotel: {

                    ...hotel,

                    property_token:
                        propertyToken

                }

            });

        }


        /* =================================================
           REVIEWS
           
           KEEP SERPAPI REVIEWS.
        ================================================= */

        if (
            action === "reviews"
        ) {

            const propertyToken =
                inputData.property_token;


            if (!propertyToken) {

                return res.status(400).json({

                    success: false,

                    error:
                        "property_token is required"

                });

            }


            const nextPageToken =
                inputData.next_page_token ||
                null;


            const sortBy =
                inputData.sort_by ||
                "2";


            const language =
                inputData.hl ||
                "en";


            const serpURL =
                new URL(
                    "https://serpapi.com/search"
                );


            serpURL.searchParams.set(
                "engine",
                "google_hotels_reviews"
            );


            serpURL.searchParams.set(
                "property_token",
                propertyToken
            );


            serpURL.searchParams.set(
                "sort_by",
                String(sortBy)
            );


            serpURL.searchParams.set(
                "hl",
                language
            );


            if (nextPageToken) {

                serpURL.searchParams.set(
                    "next_page_token",
                    nextPageToken
                );

            }


            if (
                inputData.category_token
            ) {

                serpURL.searchParams.set(
                    "category_token",
                    inputData.category_token
                );

            }


            if (
                inputData.source_number
            ) {

                serpURL.searchParams.set(
                    "source_number",
                    inputData.source_number
                );

            }


            serpURL.searchParams.set(
                "api_key",
                SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpURL
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                data.error
            ) {

                return res.status(
                    response.ok
                        ? 500
                        : response.status
                ).json({

                    success: false,

                    error:
                        data.error ||
                        `SerpAPI returned ${response.status}`

                });

            }


            const reviews =
                Array.isArray(data.reviews)
                    ? data.reviews
                    : [];


            const pagination =
                data.serpapi_pagination ||
                {};


            return res.status(200).json({

                success: true,

                property_token:
                    propertyToken,

                reviews:
                    reviews,

                review_count:
                    reviews.length,

                overall_rating:
                    data.overall_rating ??
                    data.rating ??
                    0,

                total_reviews:
                    data.total_reviews ??
                    data.total_review_count ??
                    data.reviews_count ??
                    data.review_count ??
                    0,

                next_page_token:
                    pagination.next_page_token ||
                    null,

                has_more:
                    !!pagination.next_page_token

            });

        }


        /* =================================================
           HOTEL SEARCH
           
           SERPAPI IS USED ONLY TO GET:
           
           - hotel/property identity
           - live price
           - property token
           
           Google Places supplies the actual
           hotel information.
        ================================================= */

        const destination =
            inputData.destination;


        const checkIn =
            inputData.check_in;


        const checkOut =
            inputData.check_out;


        const rooms =
            Math.max(
                1,
                Number(inputData.rooms) || 1
            );


        const adults =
            Math.max(
                1,
                Number(inputData.adults) || 1
            );


        const children =
            Math.max(
                0,
                Number(inputData.children) || 0
            );


        const seniors =
            Math.max(
                0,
                Number(inputData.seniors) || 0
            );


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
           SERPAPI PRICE SEARCH
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
                String(adults)
            );


            serpURL.searchParams.set(
                "children",
                String(children)
            );


            serpURL.searchParams.set(
                "rooms",
                String(rooms)
            );


            if (pageToken) {

                serpURL.searchParams.set(
                    "next_page_token",
                    pageToken
                );

            }


            serpURL.searchParams.set(
                "api_key",
                SERPAPI_KEY
            );


            const response =
                await fetch(
                    serpURL
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                data.error
            ) {

                throw new Error(
                    data.error ||
                    `SerpAPI returned ${response.status}`
                );

            }


            return data;

        }


        /* =================================================
           GET SERPAPI RESULTS
        ================================================= */

        let serpHotels = [];


        let data =
            await fetchHotels();


        if (
            Array.isArray(data.properties)
        ) {

            serpHotels.push(
                ...data.properties
            );

        }


        let nextPageToken =
            data.serpapi_pagination
                ?.next_page_token;


        let page = 0;


        while (
            nextPageToken &&
            page < 2
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

                serpHotels.push(
                    ...nextData.properties
                );

            }


            nextPageToken =
                nextData.serpapi_pagination
                    ?.next_page_token ||
                null;


            page++;

        }


        /* =================================================
           REMOVE SERPAPI DUPLICATES
        ================================================= */

        const uniqueSerpHotels =
            new Map();


        serpHotels.forEach(
            hotel => {

                if (!hotel) return;


                const key =
                    hotel.property_token ||
                    hotel.name;


                if (
                    key &&
                    !uniqueSerpHotels.has(key)
                ) {

                    uniqueSerpHotels.set(
                        key,
                        hotel
                    );

                }

            }
        );


        serpHotels =
            Array.from(
                uniqueSerpHotels.values()
            );


        /* =================================================
           GET GOOGLE PLACES DATA
           
           Every hotel gets matched to Google.
        ================================================= */

        const finalHotels = [];


        for (
            const serpHotel
            of serpHotels
        ) {

            try {

                console.log(
                    "================================="
                );

                console.log(
                    "MATCHING HOTEL TO GOOGLE PLACES:"
                );

                console.log(
                    serpHotel.name
                );


                const googlePlace =
                    await findGooglePlace(
                        serpHotel
                    );


                if (!googlePlace) {

                    console.warn(
                        "GOOGLE PLACE NOT FOUND:",
                        serpHotel.name
                    );

                    /*
                       Do not expose a SerpAPI hotel
                       as the primary hotel record.
                    */

                    continue;

                }


                const googleHotel =
                    normalizeGooglePlace(
                        googlePlace
                    );


                if (!googleHotel) {

                    continue;

                }


                /*
                   =================================================
                   PRICE ONLY FROM SERPAPI
                   =================================================
                */

                const price =
                    serpHotel
                        .rate_per_night
                        ?.lowest ??
                    serpHotel
                        .rate_per_night
                        ?.extracted_lowest ??
                    serpHotel
                        .total_rate
                        ?.lowest ??
                    serpHotel
                        .total_rate
                        ?.extracted_lowest ??
                    serpHotel.price ??
                    "";


                const extractedPrice =
                    serpHotel
                        .rate_per_night
                        ?.extracted_lowest ??
                    serpHotel
                        .total_rate
                        ?.extracted_lowest ??
                    null;


                /*
                   Only return hotels that actually
                   have a live SerpAPI price.
                */

                if (
                    price === "" ||
                    price === null ||
                    price === undefined
                ) {

                    continue;

                }


                const numericPrice =
                    Number(
                        String(price)
                            .replace(
                                /[^0-9.]/g,
                                ""
                            )
                    );


                if (
                    !Number.isFinite(
                        numericPrice
                    ) ||
                    numericPrice <= 0
                ) {

                    continue;

                }


                /*
                   MERGED HOTEL OBJECT
                */

                finalHotels.push({

                    /*
                       Google Places information
                    */

                    ...googleHotel,


                    /*
                       SerpAPI identifiers
                    */

                    property_token:
                        serpHotel.property_token ||
                        "",


                    /*
                       ONLY PRICE DATA COMES
                       FROM SERPAPI
                    */

                    rate_per_night: {

                        lowest:
                            price,

                        extracted_lowest:
                            extractedPrice

                    },


                    price:
                        price,


                    price_source:
                        "SerpAPI Google Hotels",


                    /*
                       Search dates
                    */

                    check_in:
                        checkIn,

                    check_out:
                        checkOut,


                    rooms:
                        rooms,

                    adults:
                        adults,

                    children:
                        children,

                    seniors:
                        seniors

                });

            }
            catch (hotelError) {

                console.error(
                    "HOTEL GOOGLE MATCH ERROR:",
                    hotelError
                );

            }

        }


        /* =================================================
           REMOVE FINAL DUPLICATES
        ================================================= */

        const finalUnique =
            new Map();


        finalHotels.forEach(
            hotel => {

                const key =
                    hotel.google_place_id ||
                    hotel.name;


                if (
                    key &&
                    !finalUnique.has(key)
                ) {

                    finalUnique.set(
                        key,
                        hotel
                    );

                }

            }
        );


        const allHotels =
            Array.from(
                finalUnique.values()
            );


        console.log(
            "================================="
        );

        console.log(
            "FINAL GOOGLE + SERPAPI HOTEL COUNT:",
            allHotels.length
        );

        console.log(
            "================================="
        );


        return res.status(200).json({

            success: true,

            destination:
                destination,

            check_in:
                checkIn,

            check_out:
                checkOut,

            rooms:
                rooms,

            adults:
                adults,

            children:
                children,

            seniors:
                seniors,

            properties:
                allHotels

        });

    }
    catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "HOTEL BACKEND ERROR:"
        );

        console.error(
            error
        );

        console.error(
            "================================="
        );


        return res.status(500).json({

            success: false,

            error:
                "Hotel search failed",

            details:
                error?.message ||
                String(error)

        });

    }

}
