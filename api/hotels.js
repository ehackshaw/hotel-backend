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
        "GET,OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    if(req.method === "OPTIONS"){

        return res.status(200).end();

    }


    if(req.method !== "GET"){

        return res.status(405).json({

            error:
                "Method not allowed"

        });

    }


    /* =================================================
       ENVIRONMENT
    ================================================= */

    const GOOGLE_KEY =
        process.env.GOOGLE_PLACES_API_KEY;

    const SERP_KEY =
        process.env.SERPAPI_KEY;


    if(!GOOGLE_KEY){

        return res.status(500).json({

            error:
                "GOOGLE_PLACES_API_KEY is not configured"

        });

    }


    if(!SERP_KEY){

        return res.status(500).json({

            error:
                "SERPAPI_KEY is not configured"

        });

    }


    /* =================================================
       QUERY PARAMETERS
    ================================================= */

    const {

        destination = "",

        checkin = "",

        checkout = "",

        rooms = "1",

        adults = "1",

        children = "0",

        babies = "0",

        seniors = "0",

        guests = "1"

    } = req.query;


    if(!destination){

        return res.status(400).json({

            error:
                "destination is required"

        });

    }


    /* =================================================
       HELPERS
    ================================================= */

    function normalizeName(value){

        return String(value || "")
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                " "
            )
            .trim();

    }


    function distanceKm(
        lat1,
        lon1,
        lat2,
        lon2
    ){

        if(
            !Number.isFinite(Number(lat1)) ||
            !Number.isFinite(Number(lon1)) ||
            !Number.isFinite(Number(lat2)) ||
            !Number.isFinite(Number(lon2))
        ){

            return Infinity;

        }


        const R = 6371;

        const dLat =
            (
                Number(lat2) -
                Number(lat1)
            ) *
            Math.PI /
            180;

        const dLon =
            (
                Number(lon2) -
                Number(lon1)
            ) *
            Math.PI /
            180;


        const a =
            Math.sin(dLat / 2) ** 2 +

            Math.cos(
                Number(lat1) *
                Math.PI /
                180
            ) *

            Math.cos(
                Number(lat2) *
                Math.PI /
                180
            ) *

            Math.sin(dLon / 2) ** 2;


        return (
            2 *
            R *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            )
        );

    }


    function getSummaryText(value){

        if(!value){
            return "";
        }

        if(typeof value === "string"){
            return value;
        }

        if(
            value.text &&
            typeof value.text === "string"
        ){

            return value.text;

        }

        return "";

    }


    function getPhotoUrl(
        photoName
    ){

        if(!photoName){
            return "";
        }

        /*
           This uses the Google Places photo
           media endpoint.

           The key is only used by the backend
           while constructing the URL.
        */

        return (
            "https://places.googleapis.com/v1/" +
            photoName +
            "/media?maxWidthPx=1200&key=" +
            encodeURIComponent(
                GOOGLE_KEY
            )
        );

    }


    function getAmenities(place){

        const amenities = [];


        /*
           Google Places boolean fields
        */

        if(place.servesBreakfast){
            amenities.push(
                "Breakfast"
            );
        }

        if(place.servesLunch){
            amenities.push(
                "Lunch"
            );
        }

        if(place.servesDinner){
            amenities.push(
                "Restaurant"
            );
        }

        if(place.servesCoffee){
            amenities.push(
                "Coffee"
            );
        }

        if(place.servesVegetarianFood){
            amenities.push(
                "Vegetarian Food"
            );
        }

        if(place.goodForChildren){
            amenities.push(
                "Family Friendly"
            );
        }

        if(place.goodForGroups){
            amenities.push(
                "Good for Groups"
            );
        }

        if(place.allowsDogs){
            amenities.push(
                "Pet Friendly"
            );
        }

        if(place.parkingOptions){
            amenities.push(
                "Parking"
            );
        }

        if(place.accessibilityOptions){
            amenities.push(
                "Accessible"
            );
        }

        if(place.restroom){
            amenities.push(
                "Restrooms"
            );
        }


        return [
            ...new Set(
                amenities
            )
        ];

    }


    function getSerpPrice(property){

        if(!property){
            return null;
        }


        const nightly =
            property.rate_per_night ||
            {};

        const total =
            property.total_rate ||
            {};


        return {

            ratePerNight:
                nightly.lowest ||
                "",

            extractedRatePerNight:
                nightly.extracted_lowest ??
                null,

            beforeTaxesPerNight:
                nightly.before_taxes_fees ||
                "",

            total:
                total.lowest ||
                "",

            extractedTotal:
                total.extracted_lowest ??
                null,

            beforeTaxesTotal:
                total.before_taxes_fees ||
                "",

            checkInTime:
                property.check_in_time ||
                "",

            checkOutTime:
                property.check_out_time ||
                "",

            freeCancellation:
                property.free_cancellation ??
                null

        };

    }


    /* =================================================
       1. GOOGLE PLACES TEXT SEARCH
    ================================================= */

    let places = [];


    try{

        const placesResponse =
            await fetch(
                "https://places.googleapis.com/v1/places:searchText",
                {

                    method:
                        "POST",

                    headers:{

                        "Content-Type":
                            "application/json",

                        "X-Goog-Api-Key":
                            GOOGLE_KEY,

                        "X-Goog-FieldMask":
                            [
                                "places.id",
                                "places.name",
                                "places.displayName",
                                "places.formattedAddress",
                                "places.location",
                                "places.primaryType",
                                "places.primaryTypeDisplayName",
                                "places.types",
                                "places.rating",
                                "places.userRatingCount",
                                "places.websiteUri",
                                "places.internationalPhoneNumber",
                                "places.googleMapsUri",
                                "places.photos",
                                "places.editorialSummary",
                                "places.generativeSummary",
                                "places.reviews",
                                "places.reviewSummary",
                                "places.goodForChildren",
                                "places.goodForGroups",
                                "places.allowsDogs",
                                "places.parkingOptions",
                                "places.paymentOptions",
                                "places.accessibilityOptions",
                                "places.restroom",
                                "places.servesBreakfast",
                                "places.servesLunch",
                                "places.servesDinner",
                                "places.servesCoffee",
                                "places.servesVegetarianFood",
                                "places.businessStatus"
                            ].join(",")

                    },

                    body:
                        JSON.stringify({

                            textQuery:
                                `hotels in ${destination}`,

                            languageCode:
                                "en",

                            regionCode:
                                "TT",

                            includedType:
                                "hotel",

                            pageSize:
                                20

                        })

                }
            );


        const placesData =
            await placesResponse.json();


        if(!placesResponse.ok){

            console.error(
                "Google Places error:",
                placesData
            );

            throw new Error(
                placesData.error?.message ||
                "Google Places search failed"
            );

        }


        places =
            Array.isArray(
                placesData.places
            )
            ?
            placesData.places
            :
            [];

    }
    catch(error){

        console.error(
            "Google Places:",
            error
        );


        return res.status(500).json({

            error:
                "Google Places search failed",

            details:
                error.message

        });

    }


    /* =================================================
       2. SERPAPI GOOGLE HOTELS
    ================================================= */

    let serpProperties = [];


    try{

        const serpParams =
            new URLSearchParams({

                engine:
                    "google_hotels",

                q:
                    destination,

                check_in_date:
                    checkin,

                check_out_date:
                    checkout,

                adults:
                    String(adults),

                children:
                    String(children),

                rooms:
                    String(rooms),

                currency:
                    "USD",

                hl:
                    "en",

                api_key:
                    SERP_KEY

            });


        const serpResponse =
            await fetch(
                "https://serpapi.com/search?" +
                serpParams.toString()
            );


        const serpData =
            await serpResponse.json();


        if(!serpResponse.ok){

            console.error(
                "SerpApi HTTP error:",
                serpData
            );

        }
        else{

            serpProperties =
                Array.isArray(
                    serpData.properties
                )
                ?
                serpData.properties
                :
                [];

        }

    }
    catch(error){

        /*
           We deliberately do NOT fail the
           entire hotel search if SerpApi
           fails.

           Google hotel information can still
           be displayed.
        */

        console.error(
            "SerpApi error:",
            error
        );

        serpProperties = [];

    }


    /* =================================================
       3. MERGE GOOGLE + SERPAPI
    ================================================= */

    const mergedHotels =
        places.map(
            place => {

                const placeName =
                    normalizeName(
                        place.displayName?.text ||
                        ""
                    );


                const placeLat =
                    place.location?.latitude;

                const placeLng =
                    place.location?.longitude;


                /*
                   Find closest matching SerpApi
                   hotel.

                   Name is preferred.
                   Coordinates provide a second
                   layer of protection.
                */

                let bestMatch =
                    null;

                let bestScore =
                    Infinity;


                serpProperties.forEach(
                    property => {

                        if(
                            !property ||
                            !property.name
                        ){

                            return;

                        }


                        const serpName =
                            normalizeName(
                                property.name
                            );


                        const nameMatch =
                            placeName ===
                            serpName;


                        const partialMatch =
                            placeName.includes(
                                serpName
                            ) ||
                            serpName.includes(
                                placeName
                            );


                        const km =
                            distanceKm(
                                placeLat,
                                placeLng,
                                property.gps_coordinates?.latitude,
                                property.gps_coordinates?.longitude
                            );


                        /*
                           Strong exact name match
                        */

                        if(nameMatch){

                            const score =
                                km * 0.01;

                            if(
                                score <
                                bestScore
                            ){

                                bestScore =
                                    score;

                                bestMatch =
                                    property;

                            }

                            return;

                        }


                        /*
                           Partial name + close coordinates
                        */

                        if(
                            partialMatch &&
                            km <= 10
                        ){

                            const score =
                                10 + km;

                            if(
                                score <
                                bestScore
                            ){

                                bestScore =
                                    score;

                                bestMatch =
                                    property;

                            }

                        }

                    }
                );


                const price =
                    getSerpPrice(
                        bestMatch
                    );


                /*
                   Google description.

                   Google may return either
                   editorialSummary or
                   generativeSummary.
                */

                const description =

                    getSummaryText(
                        place.generativeSummary
                    ) ||

                    getSummaryText(
                        place.editorialSummary
                    ) ||

                    "";


                /*
                   Photos

                   Google returns photo resource
                   names. Convert the first few
                   to media URLs.
                */

                const photos =
                    Array.isArray(
                        place.photos
                    )
                    ?
                    place.photos
                        .slice(0,10)
                        .map(
                            photo =>
                                getPhotoUrl(
                                    photo.name
                                )
                        )
                        .filter(Boolean)
                    :
                    [];


                /*
                   Reviews
                */

                const reviews =
                    Array.isArray(
                        place.reviews
                    )
                    ?
                    place.reviews
                    :
                    [];


                /*
                   Google review summary
                */

                const reviewSummary =
                    place.reviewSummary ||
                    null;


                /*
                   Normalize Google review
                   distribution if available.
                */

                const ratings = [];


                if(
                    reviewSummary &&
                    Array.isArray(
                        reviewSummary.ratingCount
                    )
                ){

                    reviewSummary.ratingCount
                        .forEach(
                            item => {

                                ratings.push({

                                    stars:
                                        Number(
                                            item.rating
                                        ),

                                    count:
                                        Number(
                                            item.count
                                        )

                                });

                            }
                        );

                }


                return {

                    /* =========================
                       GOOGLE IDENTITY
                    ========================= */

                    placeId:
                        place.id || "",

                    name:
                        place.displayName?.text ||
                        "",

                    address:
                        place.formattedAddress ||
                        "",

                    formattedAddress:
                        place.formattedAddress ||
                        "",

                    latitude:
                        place.location?.latitude ??
                        null,

                    longitude:
                        place.location?.longitude ??
                        null,

                    primaryType:
                        place.primaryType ||
                        "",

                    primaryTypeDisplayName:
                        place.primaryTypeDisplayName?.text ||
                        "",

                    businessStatus:
                        place.businessStatus ||
                        "",


                    /* =========================
                       GOOGLE CONTACT
                    ========================= */

                    phone:
                        place.internationalPhoneNumber ||
                        "",

                    internationalPhoneNumber:
                        place.internationalPhoneNumber ||
                        "",

                    website:
                        place.websiteUri ||
                        "",

                    websiteUri:
                        place.websiteUri ||
                        "",

                    googleMapsUri:
                        place.googleMapsUri ||
                        "",


                    /* =========================
                       GOOGLE RATING
                    ========================= */

                    rating:
                        place.rating ??
                        null,

                    overallRating:
                        place.rating ??
                        null,

                    reviewCount:
                        place.userRatingCount ??
                        0,

                    userRatingCount:
                        place.userRatingCount ??
                        0,


                    /* =========================
                       GOOGLE DESCRIPTION
                    ========================= */

                    description:
                        description,

                    editorialSummary:
                        getSummaryText(
                            place.editorialSummary
                        ),

                    generativeSummary:
                        getSummaryText(
                            place.generativeSummary
                        ),


                    /* =========================
                       GOOGLE PHOTOS
                    ========================= */

                    photos:
                        photos,

                    image:
                        photos[0] ||
                        "",


                    /* =========================
                       GOOGLE REVIEWS
                    ========================= */

                    reviews:
                        reviews,

                    reviewSummary:
                        reviewSummary,

                    ratings:
                        ratings,


                    /* =========================
                       GOOGLE AMENITIES
                    ========================= */

                    amenities:
                        getAmenities(
                            place
                        ),

                    servesBreakfast:
                        !!place.servesBreakfast,

                    servesLunch:
                        !!place.servesLunch,

                    servesDinner:
                        !!place.servesDinner,

                    servesCoffee:
                        !!place.servesCoffee,

                    servesVegetarianFood:
                        !!place.servesVegetarianFood,

                    goodForChildren:
                        !!place.goodForChildren,

                    goodForGroups:
                        !!place.goodForGroups,

                    allowsDogs:
                        !!place.allowsDogs,

                    parkingOptions:
                        place.parkingOptions ||
                        null,

                    accessibilityOptions:
                        place.accessibilityOptions ||
                        null,

                    restroom:
                        place.restroom ||
                        null,

                    paymentOptions:
                        place.paymentOptions ||
                        null,


                    /* =========================
                       SERPAPI PRICE ONLY
                    ========================= */

                    price:
                        price,

                    ratePerNight:
                        price.ratePerNight,

                    totalRate:
                        price.total,

                    extractedRatePerNight:
                        price.extractedRatePerNight,

                    extractedTotal:
                        price.extractedTotal,

                    beforeTaxesPerNight:
                        price.beforeTaxesPerNight,

                    beforeTaxesTotal:
                        price.beforeTaxesTotal,

                    checkInTime:
                        price.checkInTime,

                    checkOutTime:
                        price.checkOutTime,


                    /* =========================
                       SERPAPI MATCH INFO
                    ========================= */

                    serpApiMatched:
                        !!bestMatch,

                    serpApiPropertyToken:
                        bestMatch?.property_token ||
                        "",

                    serpApiName:
                        bestMatch?.name ||
                        "",

                    serpApiHotelClass:
                        bestMatch?.hotel_class ||
                        "",

                    serpApiImages:
                        Array.isArray(
                            bestMatch?.images
                        )
                        ?
                        bestMatch.images
                        :
                        []

                };

            }
        );


    /* =================================================
       4. RETURN
    ================================================= */

    return res.status(200).json({

        success:
            true,

        destination:
            destination,

        checkin:
            checkin,

        checkout:
            checkout,

        rooms:
            Number(rooms),

        adults:
            Number(adults),

        children:
            Number(children),

        babies:
            Number(babies),

        seniors:
            Number(seniors),

        guests:
            Number(guests),

        count:
            mergedHotels.length,

        hotels:
            mergedHotels

    });

}
