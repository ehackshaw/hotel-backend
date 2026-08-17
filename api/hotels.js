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
        Number(
            req.query.rooms || 1
        );


    const adults =
        Number(
            req.query.adults || 1
        );


    const children =
        Number(
            req.query.children || 0
        );


    const babies =
        Number(
            req.query.babies || 0
        );


    const seniors =
        Number(
            req.query.seniors || 0
        );


    const guests =
        Number(
            req.query.guests ||
            adults ||
            1
        );


    if(!destination){

        return res.status(400).json({

            success:false,

            error:
                "Destination is required."

        });

    }


    if(!checkin){

        return res.status(400).json({

            success:false,

            error:
                "Check-in date is required."

        });

    }


    if(!checkout){

        return res.status(400).json({

            success:false,

            error:
                "Check-out date is required."

        });

    }


    console.log(
        "HOTEL SEARCH:",
        {
            destination,
            checkin,
            checkout,
            rooms,
            adults,
            children,
            babies,
            seniors,
            guests
        }
    );


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

            Math.sin(
                dLat / 2
            ) ** 2

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

            Math.sin(
                dLon / 2
            ) ** 2;


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
            value.text
        ){

            return value.text;

        }


        return "";

    }


    function getAmenities(place){

        const amenities = [];


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


        return [
            ...new Set(
                amenities
            )
        ];

    }


    /* =================================================
       GOOGLE PLACES
    ================================================= */

    let googleHotels = [];


    try{

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

                        /*
                         * IMPORTANT:
                         * Keep this field mask conservative.
                         */

                        "X-Goog-FieldMask":
                            [
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
                                "places.types",
                                "places.primaryType",
                                "places.businessStatus"
                            ].join(",")

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


        const googleData =
            await googleResponse.json();


        console.log(
            "GOOGLE STATUS:",
            googleResponse.status
        );


        if(!googleResponse.ok){

            console.error(
                "GOOGLE PLACES ERROR:",
                googleData
            );


            return res.status(500).json({

                success:false,

                error:
                    "Google Places request failed.",

                googleError:
                    googleData.error?.message ||
                    googleData.error ||
                    googleData

            });

        }


        googleHotels =
            Array.isArray(
                googleData.places
            )
            ?
            googleData.places
            :
            [];


        console.log(
            "GOOGLE HOTELS FOUND:",
            googleHotels.length
        );

    }
    catch(error){

        console.error(
            "GOOGLE FETCH ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            error:
                "Unable to connect to Google Places.",

            details:
                error.message

        });

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


        const serpData =
            await serpResponse.json();


        console.log(
            "SERPAPI STATUS:",
            serpResponse.status
        );


        if(!serpResponse.ok){

            serpError =
                serpData.error ||
                `SerpApi HTTP ${serpResponse.status}`;

            console.error(
                "SERPAPI ERROR:",
                serpData
            );

        }
        else{

            serpHotels =
                Array.isArray(
                    serpData.properties
                )
                ?
                serpData.properties
                :
                [];

        }


        console.log(
            "SERPAPI HOTELS FOUND:",
            serpHotels.length
        );

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


                let best =
                    null;

                let bestScore =
                    Infinity;


                for(
                    const serpHotel
                    of serpHotels
                ){

                    if(
                        !serpHotel.name
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
                        ) ||
                        serpName.includes(
                            googleName
                        );


                    const distance =
                        distanceKm(

                            googleLat,

                            googleLng,

                            serpHotel
                                .gps_coordinates
                                ?.latitude,

                            serpHotel
                                .gps_coordinates
                                ?.longitude

                        );


                    /*
                     * Exact name is strongest.
                     */

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


                    /*
                     * Partial name + nearby.
                     */

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

                const description =

                    summaryText(
                        place.editorialSummary
                    );


                /* =================================================
                   PHOTOS
                ================================================= */

                const photos = [];


                if(
                    Array.isArray(
                        place.photos
                    )
                ){

                    place.photos
                        .forEach(
                            photo => {

                                if(
                                    photo.name
                                ){

                                    photos.push(
                                        photo.name
                                    );

                                }

                            }
                        );

                }


                /* =================================================
                   RETURN HOTEL
                ================================================= */

                return {

                    /*
                     * GOOGLE
                     */

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

                    businessStatus:
                        place.businessStatus ||
                        "",

                    description:
                        description,

                    editorialSummary:
                        description,

                    photos:
                        photos,

                    /*
                     * Frontend can use the first
                     * Google photo resource.
                     */

                    image:
                        photos[0] ||
                        "",


                    /*
                     * AMENITIES
                     */

                    amenities:
                        getAmenities(
                            place
                        ),


                    /*
                     * SERPAPI PRICE
                     */

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


                    /*
                     * MATCH INFORMATION
                     */

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

        destination:
            destination,

        checkin:
            checkin,

        checkout:
            checkout,

        rooms:
            rooms,

        adults:
            adults,

        children:
            children,

        babies:
            babies,

        seniors:
            seniors,

        guests:
            guests,

        count:
            hotels.length,

        /*
         * Useful debugging information.
         */

        googleHotelCount:
            googleHotels.length,

        serpApiHotelCount:
            serpHotels.length,

        serpApiError:
            serpError,

        hotels:
            hotels

    });

}
