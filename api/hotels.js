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

        error:  
            "Method not allowed"  

    });  

}  


try {  

    console.log(  
        "================================="  
    );  

    console.log(  
        "HOTEL BACKEND REQUEST"  
    );  

    console.log(  
        "METHOD:",  
        req.method  
    );  

    console.log(  
        "QUERY:",  
        req.query  
    );  

    console.log(  
        "BODY:",  
        req.body  
    );  

    console.log(  
        "================================="  
    );  


    /* =================================================  
       INPUT  
    ================================================= */  

    const inputData =  
        req.method === "GET"  
            ? req.query || {}  
            : req.body || {};  


    const action =  
        inputData.action ||  
        "";  


    /* =================================================  
       SERPAPI KEY CHECK  
    ================================================= */  

    if (  
        !process.env.SERPAPI_KEY  
    ) {  

        return res.status(500).json({  

            success: false,  

            error:  
                "SERPAPI_KEY is not configured in Vercel."  

        });  

    }  


    /* =================================================  
       HOTEL DETAILS  
    ================================================= */  

    if (  
        action === "details"  
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
            "HOTEL DETAILS STATUS:",  
            response.status  
        );  


        console.log(  
            "HOTEL DETAILS RESPONSE:",  
            data  
        );  


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


        return res.status(200).json({  

            success: true,  

            hotel:  
                data.property ||  
                data  

        });  

    }  

/* =================================================
   HOTEL PHOTOS
================================================= */

if (
    action === "photos"
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


    /* =============================================
       OPTIONAL PAGINATION
    ============================================= */

    const nextPageToken =
        inputData.next_page_token ||
        null;


    /* =============================================
       SERPAPI HOTEL PHOTOS URL
    ============================================= */

    const serpURL =
        new URL(
            "https://serpapi.com/search"
        );


    serpURL.searchParams.set(
        "engine",
        "google_hotels_photos"
    );


    serpURL.searchParams.set(
        "property_token",
        propertyToken
    );


    if (
        nextPageToken
    ) {

        serpURL.searchParams.set(
            "next_page_token",
            nextPageToken
        );

    }


    serpURL.searchParams.set(
        "api_key",
        process.env.SERPAPI_KEY
    );


    /* =============================================
       LOG REQUEST WITHOUT API KEY
    ============================================= */

    console.log(
        "FETCHING HOTEL PHOTOS:"
    );


    console.log(
        serpURL.toString()
            .replace(
                process.env.SERPAPI_KEY,
                "HIDDEN"
            )
    );


    /* =============================================
       FETCH PHOTOS
    ============================================= */

    const response =
        await fetch(
            serpURL
        );


    const data =
        await response.json();


    /* =============================================
       LOG RESPONSE
    ============================================= */

    console.log(
        "HOTEL PHOTOS STATUS:",
        response.status
    );


    console.log(
        "HOTEL PHOTOS RESPONSE:",
        data
    );


    /* =============================================
       SERPAPI ERROR
    ============================================= */

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


    /* =============================================
       GET PHOTO SECTIONS
    ============================================= */

    const sections =
        Array.isArray(
            data.sections
        )
            ? data.sections
            : [];


    /* =============================================
       FLATTEN ALL PHOTOS
    ============================================= */

    const photos = [];


    sections.forEach(
        section => {

            if (!section) {
                return;
            }


            const sectionTitle =
                section.title ||
                "";


            const images =
                Array.isArray(
                    section.images
                )
                    ? section.images
                    : [];


            images.forEach(
                image => {

                    if (!image) {
                        return;
                    }


                    photos.push({

                        section:
                            sectionTitle,

                        thumbnail:
                            image.thumbnail ||
                            null,

                        image:
                            image.image ||
                            null,

                        original_image:
                            image.original_image ||
                            image.image ||
                            image.thumbnail ||
                            null,

                        width:
                            image.width ||
                            null,

                        height:
                            image.height ||
                            null,

                        alt:
                            image.alt ||
                            null,

                        source:
                            image.source ||
                            null,

                        source_link:
                            image.source_link ||
                            null

                    });

                }
            );

        }
    );


    /* =============================================
       REMOVE DUPLICATE PHOTOS
    ============================================= */

    const uniquePhotos =
        new Map();


    photos.forEach(
        photo => {

            const key =
                photo.original_image ||
                photo.image ||
                photo.thumbnail;


            if (
                key &&
                !uniquePhotos.has(key)
            ) {

                uniquePhotos.set(
                    key,
                    photo
                );

            }

        }
    );


    const finalPhotos =
        Array.from(
            uniquePhotos.values()
        );


    /* =============================================
       PAGINATION
    ============================================= */

    const pagination =
        data.serpapi_pagination ||
        {};


    const newNextPageToken =
        pagination.next_page_token ||
        null;


    /* =============================================
       RETURN PHOTOS
    ============================================= */

    console.log(
        "HOTEL PHOTO COUNT:",
        finalPhotos.length
    );


    return res.status(200).json({

        success: true,

        property_token:
            propertyToken,

        photos:
            finalPhotos,

        photo_count:
            finalPhotos.length,

        next_page_token:
            newNextPageToken,

        has_more:
            !!newNextPageToken

    });

}
    /* =================================================  
       HOTEL REVIEWS  
    ================================================= */  

    if (  
        action === "reviews"  
    ) {  

        /* =============================================  
           PROPERTY TOKEN  
        ============================================= */  

        const propertyToken =  
            inputData.property_token;  


        if (!propertyToken) {  

            return res.status(400).json({  

                success: false,  

                error:  
                    "property_token is required"  

            });  

        }  


        /* =============================================  
           OPTIONAL PAGINATION  
        ============================================= */  

        const nextPageToken =  
            inputData.next_page_token ||  
            null;  


        /* =============================================  
           OPTIONAL SORT  
             
           1 = Most helpful  
           2 = Most recent  
           3 = Highest score  
           4 = Lowest score  
             
           Default:  
           Most recent  
        ============================================= */  

        const sortBy =  
            inputData.sort_by ||  
            "2";  


        /* =============================================  
           OPTIONAL LANGUAGE  
        ============================================= */  

        const language =  
            inputData.hl ||  
            "en";  


        /* =============================================  
           SERPAPI REVIEWS URL  
        ============================================= */  

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


        /* =============================================  
           NEXT PAGE  
        ============================================= */  

        if (  
            nextPageToken  
        ) {  

            serpURL.searchParams.set(  
                "next_page_token",  
                nextPageToken  
            );  

        }  


        /* =============================================  
           OPTIONAL CATEGORY  
        ============================================= */  

        if (  
            inputData.category_token  
        ) {  

            serpURL.searchParams.set(  
                "category_token",  
                inputData.category_token  
            );  

        }  


        /* =============================================  
           OPTIONAL REVIEW SOURCE  
        ============================================= */  

        if (  
            inputData.source_number  
        ) {  

            serpURL.searchParams.set(  
                "source_number",  
                inputData.source_number  
            );  

        }  


        /* =============================================  
           SERPAPI KEY  
        ============================================= */  

        serpURL.searchParams.set(  
            "api_key",  
            process.env.SERPAPI_KEY  
        );  


        /* =============================================  
           LOG REQUEST WITHOUT API KEY  
        ============================================= */  

        console.log(  
            "FETCHING HOTEL REVIEWS:"  
        );  

        console.log(  
            serpURL.toString()  
                .replace(  
                    process.env.SERPAPI_KEY,  
                    "HIDDEN"  
                )  
        );  


        /* =============================================  
           FETCH REVIEWS  
        ============================================= */  

        const response =  
            await fetch(  
                serpURL  
            );  


        const data =  
            await response.json();  


        /* =============================================  
           LOG RESPONSE  
        ============================================= */  

        console.log(  
            "HOTEL REVIEWS STATUS:",  
            response.status  
        );  


        console.log(  
            "HOTEL REVIEWS RESPONSE:",  
            data  
        );  


        /* =============================================  
           SERPAPI ERROR  
        ============================================= */  

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


        /* =============================================  
           GET REVIEWS  
             
           SerpAPI returns actual review objects  
           directly inside data.reviews  
        ============================================= */  

        const reviews =  
            Array.isArray(  
                data.reviews  
            )  
                ? data.reviews  
                : [];  


        /* =============================================  
           PAGINATION INFORMATION  
        ============================================= */  

        const pagination =  
            data.serpapi_pagination ||  
            {};  


        const newNextPageToken =  
            pagination.next_page_token ||  
            null;  


        /* =============================================  
           RETURN REVIEWS  
        ============================================= */  

        return res.status(200).json({  

            success: true,  

            property_token:  
                propertyToken,  

            reviews:  
                reviews,  

            review_count:  
                reviews.length,  

            next_page_token:  
                newNextPageToken,  

            has_more:  
                !!newNextPageToken,  

            search_metadata:  
                data.search_metadata ||  
                null  

        });  

    }  


    /* =================================================  
       HOTEL SEARCH INPUT  
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
            Number(  
                inputData.rooms  
            ) || 1  
        );  


    const adults =  
        Math.max(  
            1,  
            Number(  
                inputData.adults  
            ) || 1  
        );  


    const children =  
        Math.max(  
            0,  
            Number(  
                inputData.children  
            ) || 0  
        );  


    const seniors =  
        Math.max(  
            0,  
            Number(  
                inputData.seniors  
            ) || 0  
        );  


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


    console.log(  
        "HOTEL SEARCH:",  
        {  
            destination,  
            checkIn,  
            checkOut,  
            rooms,  
            adults,  
            children,  
            seniors  
        }  
    );  


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


        if (  
            pageToken  
        ) {  

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


        const data =  
            await response.json();  


        console.log(  
            "SERPAPI STATUS:",  
            response.status  
        );  


        if (  
            !response.ok  
        ) {  

            throw new Error(  
                `SerpAPI returned ${response.status}`  
            );  

        }  


        if (  
            data.error  
        ) {  

            throw new Error(  
                data.error  
            );  

        }  


        return data;  

    }  


    /* =================================================  
       GET HOTEL RESULTS  
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


    /* =================================================  
       GET ADDITIONAL PAGES  
    ================================================= */  

    let nextPageToken =  
        data.serpapi_pagination  
            ?.next_page_token;  


    let page =  
        0;  


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

            if (!hotel) return;  


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

                if (!hotel) {  

                    return false;  

                }  


                return (  
                    hotel.name ||  
                    hotel.property_token  
                );  

            }  
        );  


    /* =================================================  
       FINAL RESPONSE  
    ================================================= */  

    console.log(  
        "FINAL HOTEL COUNT:",  
        allHotels.length  
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
