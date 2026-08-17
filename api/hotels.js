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
        "GET, OPTIONS"
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
            success:false,
            error:"Method not allowed"
        });

    }


    /* =================================================
       API KEYS
    ================================================= */

    const GOOGLE_KEY =
        process.env.GOOGLE_PLACES_API_KEY;

    const SERP_KEY =
        process.env.SERPAPI_KEY;


    if(!GOOGLE_KEY){

        return res.status(500).json({

            success:false,

            error:
                "Google Places API key is missing. Add GOOGLE_PLACES_API_KEY to Vercel Environment Variables."

        });

    }


    if(!SERP_KEY){

        return res.status(500).json({

            success:false,

            error:
                "SerpApi key is missing. Add SERPAPI_KEY to Vercel Environment Variables."

        });

    }


    /* =================================================
       READ SEARCH
    ================================================= */

    const destination =
        String(
            req.query.destination || ""
        ).trim();

    const checkin =
        String(
            req.query.checkin || ""
        ).trim();

    const checkout =
        String(
            req.query.checkout || ""
        ).trim();

    const rooms =
        Math.max(
            1,
            Number(req.query.rooms || 1)
        );

    const adults =
        Math.max(
            1,
            Number(req.query.adults || 1)
        );

    const children =
        Math.max(
            0,
            Number(req.query.children || 0)
        );

    const babies =
        Math.max(
            0,
            Number(req.query.babies || 0)
        );

    const seniors =
        Math.max(
            0,
            Number(req.query.seniors || 0)
        );

    const guests =
        Math.max(
            1,
            Number(
                req.query.guests ||
                adults ||
                1
            )
        );


    /* =================================================
       VALIDATION
    ================================================= */

    if(!destination){

        return res.status(400).json({
            success:false,
            error:"Destination is required."
        });

    }

    if(!checkin){

        return res.status(400).json({
            success:false,
            error:"Check-in date is required."
        });

    }

    if(!checkout){

        return res.status(400).json({
            success:false,
            error:"Check-out date is required."
        });

    }


    console.log(
        "===================================="
    );

    console.log(
        "BOKKARA HOTEL SEARCH"
    );

    console.log({

        destination,
        checkin,
        checkout,
        rooms,
        adults,
        children,
        babies,
        seniors,
        guests

    });


    /* =================================================
       HELPERS
    ================================================= */

    function normalizeName(name){

        return String(name || "")
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                " "
            )
            .replace(
                /\s+/g,
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
            lat1 == null ||
            lon1 == null ||
            lat2 == null ||
            lon2 == null
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
            Math.sin(dLat / 2) ** 2
            +
            Math.cos(
                Number(lat1) *
                Math.PI /
                180
            )
            *
            Math.cos(
                Number(lat2) *
                Math.PI /
                180
            )
            *
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


    function summaryText(value){

        if(!value){
            return "";
        }


        if(
            typeof value === "string"
        ){

            return value;

        }


        if(
            typeof value === "object" &&
            value.text
        ){

            return value.text;

        }


        return "";

    }


    /* =================================================
       AMENITIES
    ================================================= */

    function getAmenities(place){

        const amenities = [];


        const booleanAmenities = {

            servesBreakfast:
                "Breakfast",

            servesBrunch:
                "Brunch",

            servesLunch:
                "Lunch",

            servesDinner:
                "Restaurant",

            servesCoffee:
                "Coffee",

            servesVegetarianFood:
                "Vegetarian Food",

            servesBeer:
                "Bar",

            servesWine:
                "Wine",

            servesCocktails:
                "Cocktails",

            servesDessert:
                "Dessert",

            goodForChildren:
                "Family Friendly",

            goodForGroups:
                "Good for Groups",

            allowsDogs:
                "Pet Friendly",

            takeout:
                "Takeout",

            dineIn:
                "Dine In",

            outdoorSeating:
                "Outdoor Seating",

            reservable:
                "Reservations",

            restroom:
                "Restrooms",

            delivery:
                "Delivery"

        };


        Object.keys(
            booleanAmenities
        ).forEach(
            key => {

                if(
                    place[key] === true
                ){

                    amenities.push(
                        booleanAmenities[key]
                    );

                }

            }
        );


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


        if(place.paymentOptions){

            amenities.push(
                "Payment Options"
            );

        }


        return [
            ...new Set(
                amenities
            )
        ];

    }


    /* =================================================
       GOOGLE PHOTO URL
    ================================================= */

    function createGooglePhotoUrl(
        photoName
    ){

        if(
            !photoName ||
            typeof photoName !== "string"
        ){

            return "";

        }


        /*
         * Google Places API (New)
         *
         * The photo resource is:
         *
         * places/PLACE_ID/photos/PHOTO_ID
         *
         * We convert it into a real
         * browser-loadable media URL.
         */

        return (

            "https://places.googleapis.com/v1/" +
            photoName +
            "/media" +
            "?maxWidthPx=1200" +
            "&maxHeightPx=900" +
            "&key=" +
            encodeURIComponent(
                GOOGLE_KEY
            )

        );

    }


    /* =================================================
       GOOGLE PLACES
    ================================================= */

    let googleHotels = [];

    let googleError = null;


    try{

        /*
         * IMPORTANT
         *
         * Keep this field mask conservative.
         *
         * This prevents one unsupported field
         * from breaking the entire request.
         */

        const googleFieldMask = [

            "places.id",

            "places.displayName",

            "places.formattedAddress",

            "places.location",

            "places.rating",

            "places.userRatingCount",

            "places.websiteUri",

            "places.internationalPhoneNumber",

            "places.googleMapsUri",

            "places.photos",

            "places.editorialSummary",

            "places.generativeSummary",

            "places.reviewSummary",

            "places.reviews",

            "places.types",

            "places.primaryType",

            "places.businessStatus",

            "places.accessibilityOptions",

            "places.allowsDogs",

            "places.delivery",

            "places.dineIn",

            "places.goodForChildren",

            "places.goodForGroups",

            "places.outdoorSeating",

            "places.parkingOptions",

            "places.paymentOptions",

            "places.reservable",

            "places.restroom",

            "places.servesBeer",

            "places.servesBreakfast",

            "places.servesBrunch",

            "places.servesCocktails",

            "places.servesCoffee",

            "places.servesDessert",

            "places.servesDinner",

            "places.servesLunch",

            "places.servesVegetarianFood",

            "places.servesWine",

            "places.takeout"

        ].join(",");


        const googleResponse =
            await fetch(

                "https://places.googleapis.com/v1/places:searchText",

                {

                    method:"POST",

                    headers:{

                        "Content-Type":
                            "application/json",

                        "X-Goog-Api-Key":
                            GOOGLE_KEY,

                        "X-Goog-FieldMask":
                            googleFieldMask

                    },

                    body:
                        JSON.stringify({

                            textQuery:
                                `hotels in ${destination}`,

                            languageCode:
                                "en",

                            pageSize:
                                20

                        })

                }

            );


        const googleText =
            await googleResponse.text();


        let googleData = {};


        try{

            googleData =
                JSON.parse(
                    googleText
                );

        }
        catch(error){

            googleData = {
                raw:googleText
            };

        }


        console.log(
            "GOOGLE STATUS:",
            googleResponse.status
        );


        if(!googleResponse.ok){

            googleError =

                googleData?.error?.message ||

                googleData?.error?.status ||

                googleData?.raw ||

                `Google Places HTTP ${googleResponse.status}`;


            console.error(
                "GOOGLE PLACES ERROR:",
                googleData
            );

        }
        else{

            googleHotels =

                Array.isArray(
                    googleData.places
                )

                ?

                googleData.places

                :

                [];

        }

    }
    catch(error){

        googleError =
            error.message;

        console.error(
            "GOOGLE FETCH ERROR:",
            error
        );

    }


    /* =================================================
       SERPAPI
    ================================================= */

    let serpHotels = [];

    let serpError = null;


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


        const serpText =
            await serpResponse.text();


        let serpData = {};


        try{

            serpData =
                JSON.parse(
                    serpText
                );

        }
        catch(error){

            serpData = {
                raw:serpText
            };

        }


        console.log(
            "SERPAPI STATUS:",
            serpResponse.status
        );


        if(!serpResponse.ok){

            serpError =

                serpData?.error ||

                serpData?.raw ||

                `SerpApi HTTP ${serpResponse.status}`;


            console.error(
                "SERPAPI ERROR:",
                serpData
            );

        }
        else{

            if(serpData.error){

                serpError =
                    serpData.error;

            }


            serpHotels =

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

        serpError =
            error.message;

        console.error(
            "SERPAPI FETCH ERROR:",
            error
        );

    }


    /* =================================================
       MATCH GOOGLE + SERPAPI
    ================================================= */

    const hotels =

        googleHotels.map(
            place => {

                const googleName =
                    normalizeName(
                        place.displayName?.text
                    );


                const googleLat =
                    place.location?.latitude;


                const googleLng =
                    place.location?.longitude;


                let best = null;

                let bestScore =
                    Infinity;


                for(
                    const serpHotel
                    of serpHotels
                ){

                    if(
                        !serpHotel?.name
                    ){

                        continue;

                    }


                    const serpName =
                        normalizeName(
                            serpHotel.name
                        );


                    const exact =
                        googleName ===
                        serpName;


                    const partial =

                        googleName.includes(
                            serpName
                        )

                        ||

                        serpName.includes(
                            googleName
                        );


                    const serpLat =
                        serpHotel
                            .gps_coordinates
                            ?.latitude;


                    const serpLng =
                        serpHotel
                            .gps_coordinates
                            ?.longitude;


                    const distance =
                        distanceKm(

                            googleLat,
                            googleLng,

                            serpLat,
                            serpLng

                        );


                    if(exact){

                        const score =
                            distance;


                        if(
                            score <
                            bestScore
                        ){

                            bestScore =
                                score;

                            best =
                                serpHotel;

                        }


                        continue;

                    }


                    if(
                        partial &&
                        distance <= 15
                    ){

                        const score =
                            100 +
                            distance;


                        if(
                            score <
                            bestScore
                        ){

                            bestScore =
                                score;

                            best =
                                serpHotel;

                        }

                    }

                }


                /* =================================================
                   PRICE
                ================================================= */

                const rate =
                    best?.rate_per_night ||
                    {};


                const total =
                    best?.total_rate ||
                    {};


                /* =================================================
                   DESCRIPTION
                ================================================= */

                const editorial =
                    summaryText(
                        place.editorialSummary
                    );


                const generative =
                    summaryText(
                        place.generativeSummary
                    );


                const description =
                    generative ||
                    editorial ||
                    "";


                /* =================================================
                   REVIEWS
                ================================================= */

                const reviewSummary =
                    place.reviewSummary ||
                    null;


                const reviews =
                    Array.isArray(
                        place.reviews
                    )
                    ?
                    place.reviews
                    :
                    [];


                /* =================================================
                   PHOTOS
                ================================================= */

                const googlePhotos =

                    Array.isArray(
                        place.photos
                    )

                    ?

                    place.photos

                    :

                    [];


                const photos =

                    googlePhotos
                        .map(
                            photo => {

                                const resourceName =
                                    photo?.name ||
                                    "";


                                const url =
                                    createGooglePhotoUrl(
                                        resourceName
                                    );


                                return {

                                    name:
                                        resourceName,

                                    url:
                                        url,

                                    width:
                                        photo?.widthPx ||
                                        null,

                                    height:
                                        photo?.heightPx ||
                                        null

                                };

                            }
                        )
                        .filter(
                            photo =>
                                photo.url
                        );


                const firstPhoto =
                    photos[0]?.url ||
                    "";


                /* =================================================
                   RETURN HOTEL
                ================================================= */

                return {

                    /* GOOGLE */

                    placeId:
                        place.id ||
                        "",

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
                        googleLat ??
                        null,

                    longitude:
                        googleLng ??
                        null,

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

                    website:
                        place.websiteUri ||
                        "",

                    websiteUri:
                        place.websiteUri ||
                        "",

                    phone:
                        place.internationalPhoneNumber ||
                        "",

                    internationalPhoneNumber:
                        place.internationalPhoneNumber ||
                        "",

                    googleMapsUri:
                        place.googleMapsUri ||
                        "",

                    primaryType:
                        place.primaryType ||
                        "",

                    types:
                        Array.isArray(
                            place.types
                        )
                        ?
                        place.types
                        :
                        [],

                    businessStatus:
                        place.businessStatus ||
                        "",


                    /* DESCRIPTION */

                    description:
                        description,

                    editorialSummary:
                        editorial,

                    generativeSummary:
                        generative,


                    /* REVIEWS */

                    reviewSummary:
                        reviewSummary,

                    reviews:
                        reviews,


                    /* PHOTOS */

                    photos:
                        photos,

                    /*
                     * THIS IS NOW A REAL IMAGE URL.
                     */

                    image:
                        firstPhoto,


                    /* AMENITIES */

                    amenities:
                        getAmenities(
                            place
                        ),


                    /* SERPAPI PRICE */

                    price:{

                        ratePerNight:
                            rate.lowest ||
                            "",

                        extractedRatePerNight:
                            rate.extracted_lowest ??
                            null,

                        total:
                            total.lowest ||
                            "",

                        extractedTotal:
                            total.extracted_lowest ??
                            null,

                        beforeTaxesPerNight:
                            rate.before_taxes_fees ||
                            "",

                        beforeTaxesTotal:
                            total.before_taxes_fees ||
                            ""

                    },


                    ratePerNight:
                        rate.lowest ||
                        "",

                    extractedRatePerNight:
                        rate.extracted_lowest ??
                        null,

                    totalRate:
                        total.lowest ||
                        "",

                    extractedTotal:
                        total.extracted_lowest ??
                        null,


                    /* MATCH */

                    serpApiMatched:
                        !!best,

                    serpApiName:
                        best?.name ||
                        "",

                    serpApiPropertyToken:
                        best?.property_token ||
                        ""

                };

            }
        );


    /* =================================================
       RESPONSE
    ================================================= */

    return res.status(200).json({

        success:true,

        destination,

        checkin,

        checkout,

        rooms,

        adults,

        children,

        babies,

        seniors,

        guests,

        count:
            hotels.length,

        googleHotelCount:
            googleHotels.length,

        serpApiHotelCount:
            serpHotels.length,

        googleApiError:
            googleError,

        serpApiError:
            serpError,

        hotels

    });

}
