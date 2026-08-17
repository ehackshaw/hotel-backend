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

/* =================================================
   REQUEST LOG
================================================= */

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
   HELPER:
   CREATE SERPAPI URL
================================================= */

function createSerpURL(
    engine,
    params = {}
) {

    const url =
        new URL(
            "https://serpapi.com/search"
        );


    url.searchParams.set(
        "engine",
        engine
    );


    Object.entries(params).forEach(
        ([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                url.searchParams.set(
                    key,
                    String(value)
                );

            }

        }
    );


    url.searchParams.set(
        "api_key",
        process.env.SERPAPI_KEY
    );


    return url;

}


/* =================================================
   HELPER:
   FETCH SERPAPI
================================================= */

async function fetchSerpAPI(
    url
) {

    console.log(
        "SERPAPI REQUEST:",
        url.toString()
            .replace(
                process.env.SERPAPI_KEY,
                "HIDDEN"
            )
    );


    const response =
        await fetch(
            url
        );


    const data =
        await response.json();


    console.log(
        "SERPAPI STATUS:",
        response.status
    );


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
   HELPER:
   EXTRACT PHOTOS FROM A SECTION

   Supports both:

   section.images[]

   AND

   section.photos[]
================================================= */

function extractPhotosFromSection(
    section
) {

    if (!section) {

        return [];

    }


    const sectionTitle =
        section.title ||
        "";


    let images = [];


    if (
        Array.isArray(
            section.images
        )
    ) {

        images =
            section.images;

    }
    else if (
        Array.isArray(
            section.photos
        )
    ) {

        images =
            section.photos;

    }


    return images
        .filter(
            image =>
                image &&
                (
                    image.original_image ||
                    image.image ||
                    image.photo_url ||
                    image.thumbnail ||
                    image.thumbnail_url
                )
        )
        .map(
            image => ({

                section:
                    sectionTitle,

                thumbnail:
                    image.thumbnail ||
                    image.thumbnail_url ||
                    null,

                image:
                    image.image ||
                    image.photo_url ||
                    image.original_image ||
                    image.thumbnail ||
                    image.thumbnail_url ||
                    null,

                original_image:
                    image.original_image ||
                    image.photo_url ||
                    image.image ||
                    image.thumbnail ||
                    image.thumbnail_url ||
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
                    image.source_url ||
                    null,

                posted_on:
                    image.posted_on ||
                    null

            })
        );

}


/* =================================================
   HELPER:
   DEDUPLICATE PHOTOS
================================================= */

function deduplicatePhotos(
    photos
) {

    const uniquePhotos =
        new Map();


    photos.forEach(
        photo => {

            if (!photo) {

                return;

            }


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


    return Array.from(
        uniquePhotos.values()
    );

}


/* =================================================
   HELPER:
   FETCH ALL HOTEL PHOTOS

   IMPORTANT:

   Google Hotels Photos pagination is
   SECTION-SPECIFIC.

   Each section can have its own
   next_page_token.

   We therefore keep following every
   section token until no more tokens
   exist.
================================================= */

async function fetchAllHotelPhotos(
    propertyToken
) {

    if (!propertyToken) {

        return {

            photos: [],

            photo_count: 0,

            sections: [],

            has_more: false

        };

    }


    console.log(
        "================================="
    );

    console.log(
        "FETCHING COMPLETE HOTEL GALLERY"
    );

    console.log(
        "PROPERTY TOKEN:",
        propertyToken
    );

    console.log(
        "================================="
    );


    const allPhotos = [];


    const sectionInformation =
        new Map();


    /*
       Tokens already processed.

       This prevents duplicate requests
       if SerpAPI happens to return the
       same pagination token again.
    */

    const processedTokens =
        new Set();


    /*
       Tokens waiting to be fetched.

       Each token is associated with the
       hotel property, and the API itself
       knows which photo section it belongs
       to.
    */

    const tokensToProcess = [];


    /* =================================================
       FIRST PHOTO PAGE
    ================================================= */

    const firstURL =
        createSerpURL(
            "google_hotels_photos",
            {
                property_token:
                    propertyToken
            }
        );


    const firstData =
        await fetchSerpAPI(
            firstURL
        );


    console.log(
        "INITIAL PHOTO RESPONSE RECEIVED"
    );


    /* =================================================
       PROCESS PHOTO RESPONSE
    ================================================= */

    function processPhotoResponse(
        data
    ) {

        const sections =
            Array.isArray(
                data.sections
            )
                ? data.sections
                : [];


        sections.forEach(
            section => {

                if (!section) {

                    return;

                }


                const title =
                    section.title ||
                    "";


                const total =
                    Number(
                        section.total
                    ) || 0;


                /*
                   Save section information.
                */

                if (
                    title
                ) {

                    sectionInformation.set(
                        title,
                        {
                            title,
                            total
                        }
                    );

                }


                /* =====================================
                   GET PHOTOS

                   Supports:
                   - images[]
                   - photos[]
                ===================================== */

                const sectionPhotos =
                    extractPhotosFromSection(
                        section
                    );


                allPhotos.push(
                    ...sectionPhotos
                );


                /* =====================================
                   GET SECTION PAGINATION TOKEN
                ===================================== */

                const sectionNextToken =
                    section.next_page_token ||
                    null;


                if (
                    sectionNextToken &&
                    !processedTokens.has(
                        sectionNextToken
                    )
                ) {

                    tokensToProcess.push(
                        sectionNextToken
                    );

                }

            }
        );


        /*
           Some responses may expose a
           top-level pagination token too.
        */

        const topLevelToken =
            data.serpapi_pagination
                ?.next_page_token ||
            data.next_page_token ||
            null;


        if (
            topLevelToken &&
            !processedTokens.has(
                topLevelToken
            )
        ) {

            tokensToProcess.push(
                topLevelToken
            );

        }

    }


    processPhotoResponse(
        firstData
    );


    /* =================================================
       FETCH EVERY PHOTO PAGE
    ================================================= */

    while (
        tokensToProcess.length > 0
    ) {

        const nextPageToken =
            tokensToProcess.shift();


        if (
            !nextPageToken
        ) {

            continue;

        }


        if (
            processedTokens.has(
                nextPageToken
            )
        ) {

            continue;

        }


        processedTokens.add(
            nextPageToken
        );


        console.log(
            "FETCHING NEXT PHOTO PAGE:",
            processedTokens.size
        );


        const nextURL =
            createSerpURL(
                "google_hotels_photos",
                {
                    property_token:
                        propertyToken,

                    next_page_token:
                        nextPageToken
                }
            );


        const nextData =
            await fetchSerpAPI(
                nextURL
            );


        processPhotoResponse(
            nextData
        );

    }


    /* =================================================
       DEDUPLICATE
    ================================================= */

    const finalPhotos =
        deduplicatePhotos(
            allPhotos
        );


    /* =================================================
       SECTION SUMMARY
    ================================================= */

    const sections =
        Array.from(
            sectionInformation.values()
        );


    /* =================================================
       FINAL PHOTO RESULT
    ================================================= */

    console.log(
        "================================="
    );

    console.log(
        "COMPLETE HOTEL GALLERY FINISHED"
    );

    console.log(
        "PROPERTY:",
        propertyToken
    );

    console.log(
        "RAW PHOTOS:",
        allPhotos.length
    );

    console.log(
        "UNIQUE PHOTOS:",
        finalPhotos.length
    );

    console.log(
        "SECTIONS:",
        sections.length
    );

    console.log(
        "PAGES FETCHED:",
        processedTokens.size + 1
    );

    console.log(
        "================================="
    );


    return {

        photos:
            finalPhotos,

        photo_count:
            finalPhotos.length,

        sections:
            sections,

        pages_fetched:
            processedTokens.size + 1,

        has_more:
            false

    };

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


    try {

        /* =============================================
           GET HOTEL DETAILS
        ============================================= */

        const serpURL =
            createSerpURL(
                "google_hotels",
                {
                    property_token:
                        propertyToken
                }
            );


        const data =
            await fetchSerpAPI(
                serpURL
            );


        console.log(
            "HOTEL DETAILS RESPONSE:",
            data
        );


        const hotel =
            data.property ||
            data;


        /* =============================================
           GET COMPLETE PHOTO GALLERY
        ============================================= */

        let photoData = {

            photos: [],

            photo_count: 0,

            sections: [],

            pages_fetched: 0,

            has_more: false

        };


        try {

            photoData =
                await fetchAllHotelPhotos(
                    propertyToken
                );

        }
        catch (
            photoError
        ) {

            console.error(
                "HOTEL DETAILS PHOTO ERROR:",
                photoError
            );

        }


        /* =============================================
           RETURN DETAILS + ALL PHOTOS
        ============================================= */

        return res.status(200).json({

            success: true,

            hotel: {

                ...hotel,

                photos:
                    photoData.photos,

                images:
                    photoData.photos,

                photo_count:
                    photoData.photo_count,

                photo_sections:
                    photoData.sections,

                photo_pages_fetched:
                    photoData.pages_fetched

            }

        });

    }
    catch (
        error
    ) {

        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Unable to load hotel details"

        });

    }

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


    try {

        /*
           IMPORTANT:

           We now automatically retrieve
           every available photo page.

           The frontend no longer needs to
           manually request next_page_token.
        */

        const photoData =
            await fetchAllHotelPhotos(
                propertyToken
            );


        return res.status(200).json({

            success: true,

            property_token:
                propertyToken,

            photos:
                photoData.photos,

            images:
                photoData.photos,

            photo_count:
                photoData.photo_count,

            sections:
                photoData.sections,

            pages_fetched:
                photoData.pages_fetched,

            next_page_token:
                null,

            has_more:
                false

        });

    }
    catch (
        error
    ) {

        console.error(
            "HOTEL PHOTOS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Unable to retrieve hotel photos"

        });

    }

}


/* =================================================
   HOTEL REVIEWS
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
        createSerpURL(
            "google_hotels_reviews",
            {

                property_token:
                    propertyToken,

                sort_by:
                    String(sortBy),

                hl:
                    language,

                next_page_token:
                    nextPageToken,

                category_token:
                    inputData.category_token,

                source_number:
                    inputData.source_number

            }
        );


    const data =
        await fetchSerpAPI(
            serpURL
        );


    const reviews =
        Array.isArray(
            data.reviews
        )
            ? data.reviews
            : [];


    const pagination =
        data.serpapi_pagination ||
        {};


    const newNextPageToken =
        pagination.next_page_token ||
        null;


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
        createSerpURL(
            "google_hotels",
            {

                q:
                    destination,

                check_in_date:
                    checkIn,

                check_out_date:
                    checkOut,

                adults:
                    adults,

                children:
                    children,

                rooms:
                    rooms,

                next_page_token:
                    pageToken

            }
        );


    const data =
        await fetchSerpAPI(
            serpURL
        );


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
   GET ADDITIONAL HOTEL PAGES

   Keeping your existing 2 additional
   pages.
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
   REMOVE DUPLICATE HOTELS
================================================= */

const uniqueHotels =
    new Map();


allHotels.forEach(
    hotel => {

        if (!hotel) {

            return;

        }


        const key =
            hotel.property_token ||
            hotel.name;


        if (
            key &&
            !uniqueHotels.has(
                key
            )
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


console.log(
    "HOTELS BEFORE PHOTO ENRICHMENT:",
    allHotels.length
);


/* =================================================
   FETCH COMPLETE PHOTO GALLERIES
   FOR EVERY HOTEL
=================================================

   IMPORTANT:

   This is the part that fixes the
   9-image problem.

   Every hotel is now sent through:

   google_hotels_photos

   and every available pagination page
   is followed.

================================================= */


/*
   Limit simultaneous hotel photo requests.

   We don't fire 30+ hotels at the exact
   same time because that can overwhelm
   the Vercel function and your SerpAPI
   request rate.

   This does NOT limit the number of
   photos per hotel.

   It only limits how many hotels are
   being processed simultaneously.
*/

const PHOTO_CONCURRENCY =
    3;


async function enrichHotelsWithPhotos(
    hotels
) {

    let currentIndex =
        0;


    async function worker() {

        while (
            true
        ) {

            const index =
                currentIndex++;


            if (
                index >=
                hotels.length
            ) {

                return;

            }


            const hotel =
                hotels[index];


            if (
                !hotel ||
                !hotel.property_token
            ) {

                hotel.photos =
                    Array.isArray(
                        hotel?.images
                    )
                        ? hotel.images
                        : [];


                hotel.images =
                    hotel.photos;


                hotel.photo_count =
                    hotel.photos.length;


                return;

            }


            console.log(
                "================================="
            );

            console.log(
                "FETCHING HOTEL PHOTOS",
                `${index + 1}/${hotels.length}`
            );

            console.log(
                "HOTEL:",
                hotel.name
            );

            console.log(
                "PROPERTY TOKEN:",
                hotel.property_token
            );

            console.log(
                "================================="
            );


            try {

                const photoData =
                    await fetchAllHotelPhotos(
                        hotel.property_token
                    );


                /*
                   Replace the limited
                   google_hotels images with
                   the complete photo gallery.
                */

                hotel.photos =
                    photoData.photos;


                hotel.images =
                    photoData.photos;


                hotel.photo_count =
                    photoData.photo_count;


                hotel.photo_sections =
                    photoData.sections;


                hotel.photo_pages_fetched =
                    photoData.pages_fetched;


                console.log(
                    "HOTEL COMPLETE PHOTO COUNT:",
                    hotel.name,
                    photoData.photo_count
                );

            }
            catch (
                photoError
            ) {

                console.error(
                    "PHOTO FETCH FAILED:",
                    hotel.name
                );

                console.error(
                    photoError
                );


                /*
                   If the dedicated photo API
                   fails, keep the original
                   hotel images instead of
                   destroying them.
                */

                const fallbackImages =
                    Array.isArray(
                        hotel.images
                    )
                        ? hotel.images
                        : [];


                hotel.photos =
                    fallbackImages;


                hotel.images =
                    fallbackImages;


                hotel.photo_count =
                    fallbackImages.length;


                hotel.photo_error =
                    photoError?.message ||
                    "Photo gallery unavailable";

            }

        }

    }


    const workers = [];


    const workerCount =
        Math.min(
            PHOTO_CONCURRENCY,
            hotels.length
        );


    for (
        let i = 0;
        i < workerCount;
        i++
    ) {

        workers.push(
            worker()
        );

    }


    await Promise.all(
        workers
    );


    return hotels;

}


/* =================================================
   ENRICH EVERY HOTEL WITH COMPLETE GALLERY
================================================= */

allHotels =
    await enrichHotelsWithPhotos(
        allHotels
    );


/* =================================================
   FINAL PHOTO TOTAL
================================================= */

const totalPhotos =
    allHotels.reduce(
        (
            total,
            hotel
        ) => {

            return (
                total +
                (
                    Number(
                        hotel.photo_count
                    ) || 0
                )
            );

        },
        0
    );


console.log(
    "================================="
);

console.log(
    "FINAL HOTEL COUNT:",
    allHotels.length
);

console.log(
    "TOTAL HOTEL PHOTOS:",
    totalPhotos
);

console.log(
    "================================="
);


/* =================================================
   FINAL RESPONSE
================================================= */

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

    total_hotels:
        allHotels.length,

    total_photos:
        totalPhotos,

    properties:
        allHotels

});


}
catch (
    error
) {

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
