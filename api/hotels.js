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
   REQUEST LOGGING
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
   BOOKING OPTIONS
================================================= */

if (
    action === "booking_options"
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
       OPTIONAL SEARCH PARAMETERS

       These allow the frontend to explicitly
       provide the dates / guests being displayed
       in the booking overlay.
    ============================================= */

    const checkIn =
        inputData.check_in ||
        null;


    const checkOut =
        inputData.check_out ||
        null;


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


    const rooms =
        Math.max(
            1,
            Number(
                inputData.rooms
            ) || 1
        );


    /* =============================================
       SERPAPI URL
    ============================================= */

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


    /*
       Only send these when supplied.

       The property token already identifies the
       hotel, while these parameters make sure the
       returned rates correspond to the user's
       booking search.
    */

    if (checkIn) {

        serpURL.searchParams.set(
            "check_in_date",
            checkIn
        );

    }


    if (checkOut) {

        serpURL.searchParams.set(
            "check_out_date",
            checkOut
        );

    }


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


    serpURL.searchParams.set(
        "api_key",
        process.env.SERPAPI_KEY
    );


    console.log(
        "================================="
    );

    console.log(
        "FETCHING HOTEL BOOKING OPTIONS"
    );

    console.log(
        serpURL.toString()
            .replace(
                process.env.SERPAPI_KEY,
                "HIDDEN"
            )
    );

    console.log(
        "================================="
    );


    /* =============================================
       ONE SERPAPI CALL
    ============================================= */

    const response =
        await fetch(
            serpURL
        );


    const data =
        await response.json();


    console.log(
        "BOOKING OPTIONS STATUS:",
        response.status
    );


    if (
        !response.ok ||
        data.error
    ) {

        console.error(
            "BOOKING OPTIONS ERROR:",
            data.error
        );


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
       PROPERTY
    ============================================= */

    const hotel =
        data.property ||
        data;


    /* =============================================
       PROVIDER ARRAYS

       Google Hotels can expose booking sources
       through both prices and featured_prices.
    ============================================= */

    const prices =
        Array.isArray(
            hotel.prices
        )
            ? hotel.prices
            : [];


    const featuredPrices =
        Array.isArray(
            hotel.featured_prices
        )
            ? hotel.featured_prices
            : [];


    /* =============================================
       NORMALIZATION HELPERS
    ============================================= */

    function normalizeRate(
        rate
    ) {

        if (!rate) {

            return null;

        }


        return {

            lowest:
                rate.lowest ||
                null,

            extracted_lowest:
                Number.isFinite(
                    Number(
                        rate.extracted_lowest
                    )
                )
                    ? Number(
                        rate.extracted_lowest
                    )
                    : null,

            before_taxes_fees:
                rate.before_taxes_fees ||
                null,

            extracted_before_taxes_fees:
                Number.isFinite(
                    Number(
                        rate.extracted_before_taxes_fees
                    )
                )
                    ? Number(
                        rate.extracted_before_taxes_fees
                    )
                    : null

        };

    }


    function normalizeBeds(
        beds
    ) {

        if (
            !Array.isArray(beds)
        ) {

            return [];

        }


        return beds
            .map(
                bed => {

                    if (!bed) {
                        return null;
                    }


                    return {

                        type:
                            bed.type ||
                            null,

                        count:
                            Number(
                                bed.count
                            ) || 1

                    };

                }
            )
            .filter(Boolean);

    }


    function normalizeRateOption(
        rate,
        providerName
    ) {

        if (!rate) {

            return null;

        }


        return {

            provider:
                providerName ||
                null,

            link:
                rate.link ||
                null,

            room_name:
                rate.name ||
                rate.room_name ||
                null,

            num_guests:
                Number(
                    rate.num_guests
                ) || null,

            rate_per_night:
                normalizeRate(
                    rate.rate_per_night
                ),

            total_rate:
                normalizeRate(
                    rate.total_rate
                ),

            original_rate_per_night:
                normalizeRate(
                    rate.original_rate_per_night
                ),

            original_total_rate:
                normalizeRate(
                    rate.original_total_rate
                ),

            free_cancellation:
                rate.free_cancellation === true,

            free_cancellation_until_date:
                rate.free_cancellation_until_date ||
                null,

            free_cancellation_until_time:
                rate.free_cancellation_until_time ||
                null,

            breakfast_included:
                rate.breakfast_included === true,

            beds:
                normalizeBeds(
                    rate.beds
                ),

            inclusions:
                Array.isArray(
                    rate.inclusions
                )
                    ? rate.inclusions
                    : [],

            benefits:
                rate.benefits ||
                null,

            discount_remarks:
                Array.isArray(
                    rate.discount_remarks
                )
                    ? rate.discount_remarks
                    : []

        };

    }


    /* =============================================
       BUILD PROVIDER OPTIONS
    ============================================= */

    const bookingOptions = [];


    /* =============================================
       PRICES

       These are provider-level offers.
    ============================================= */

    prices.forEach(
        price => {

            if (!price) {
                return;
            }


            const provider =
                price.source ||
                "Booking provider";


            const option = {

                provider:
                    provider,

                logo:
                    price.logo ||
                    null,

                official:
                    price.official === true,

                link:
                    price.link ||
                    null,

                num_guests:
                    Number(
                        price.num_guests
                    ) || null,

                rate_per_night:
                    normalizeRate(
                        price.rate_per_night
                    ),

                total_rate:
                    normalizeRate(
                        price.total_rate
                    ),

                original_rate_per_night:
                    normalizeRate(
                        price.original_rate_per_night
                    ),

                original_total_rate:
                    normalizeRate(
                        price.original_total_rate
                    ),

                free_cancellation:
                    price.free_cancellation === true,

                free_cancellation_until_date:
                    price.free_cancellation_until_date ||
                    null,

                free_cancellation_until_time:
                    price.free_cancellation_until_time ||
                    null,

                breakfast_included:
                    price.breakfast_included === true,

                benefits:
                    price.benefits ||
                    null,

                discount_remarks:
                    Array.isArray(
                        price.discount_remarks
                    )
                        ? price.discount_remarks
                        : [],

                rooms:
                    [],

                rates:
                    []

            };


            /* =====================================
               ROOM OPTIONS
            ===================================== */

            if (
                Array.isArray(
                    price.rooms
                )
            ) {

                price.rooms.forEach(
                    room => {

                        if (!room) {
                            return;
                        }


                        const roomOption = {

                            name:
                                room.name ||
                                null,

                            images:
                                Array.isArray(
                                    room.images
                                )
                                    ? room.images
                                    : [],

                            link:
                                room.link ||
                                price.link ||
                                null,

                            num_guests:
                                Number(
                                    room.num_guests
                                ) || null,

                            rate_per_night:
                                normalizeRate(
                                    room.rate_per_night
                                ),

                            total_rate:
                                normalizeRate(
                                    room.total_rate
                                ),

                            original_rate_per_night:
                                normalizeRate(
                                    room.original_rate_per_night
                                ),

                            original_total_rate:
                                normalizeRate(
                                    room.original_total_rate
                                ),

                            free_cancellation:
                                room.free_cancellation === true,

                            free_cancellation_until_date:
                                room.free_cancellation_until_date ||
                                null,

                            free_cancellation_until_time:
                                room.free_cancellation_until_time ||
                                null,

                            breakfast_included:
                                room.breakfast_included === true,

                            beds:
                                normalizeBeds(
                                    room.beds
                                ),

                            inclusions:
                                Array.isArray(
                                    room.inclusions
                                )
                                    ? room.inclusions
                                    : [],

                            benefits:
                                room.benefits ||
                                null,

                            rates:
                                Array.isArray(
                                    room.rates
                                )
                                    ? room.rates
                                        .map(
                                            rate =>
                                                normalizeRateOption(
                                                    rate,
                                                    provider
                                                )
                                        )
                                        .filter(Boolean)
                                    : []

                        };


                        option.rooms.push(
                            roomOption
                        );

                    }
                );

            }


            /* =====================================
               DIRECT RATE OPTIONS
            ===================================== */

            if (
                Array.isArray(
                    price.rates
                )
            ) {

                option.rates =
                    price.rates
                        .map(
                            rate =>
                                normalizeRateOption(
                                    rate,
                                    provider
                                )
                        )
                        .filter(Boolean);

            }


            bookingOptions.push(
                option
            );

        }
    );


    /* =============================================
       FEATURED PRICES

       Add any providers not already represented
       by prices.
    ============================================= */

    featuredPrices.forEach(
        featured => {

            if (!featured) {
                return;
            }


            const provider =
                featured.source ||
                "Booking provider";


            const existing =
                bookingOptions.find(
                    option =>
                        String(
                            option.provider
                        ).toLowerCase() ===
                        String(
                            provider
                        ).toLowerCase()
                );


            /*
               If the provider already exists,
               merge its richer room information.
            */

            if (existing) {

                if (
                    Array.isArray(
                        featured.rooms
                    )
                ) {

                    featured.rooms.forEach(
                        room => {

                            if (!room) {
                                return;
                            }


                            existing.rooms.push({

                                name:
                                    room.name ||
                                    null,

                                images:
                                    Array.isArray(
                                        room.images
                                    )
                                        ? room.images
                                        : [],

                                link:
                                    room.link ||
                                    featured.link ||
                                    null,

                                num_guests:
                                    Number(
                                        room.num_guests
                                    ) || null,

                                rate_per_night:
                                    normalizeRate(
                                        room.rate_per_night
                                    ),

                                total_rate:
                                    normalizeRate(
                                        room.total_rate
                                    ),

                                original_rate_per_night:
                                    normalizeRate(
                                        room.original_rate_per_night
                                    ),

                                original_total_rate:
                                    normalizeRate(
                                        room.original_total_rate
                                    ),

                                free_cancellation:
                                    room.free_cancellation === true,

                                free_cancellation_until_date:
                                    room.free_cancellation_until_date ||
                                    null,

                                free_cancellation_until_time:
                                    room.free_cancellation_until_time ||
                                    null,

                                breakfast_included:
                                    room.breakfast_included === true,

                                beds:
                                    normalizeBeds(
                                        room.beds
                                    ),

                                inclusions:
                                    Array.isArray(
                                        room.inclusions
                                    )
                                        ? room.inclusions
                                        : [],

                                benefits:
                                    room.benefits ||
                                    null,

                                rates:
                                    Array.isArray(
                                        room.rates
                                    )
                                        ? room.rates
                                            .map(
                                                rate =>
                                                    normalizeRateOption(
                                                        rate,
                                                        provider
                                                    )
                                            )
                                            .filter(Boolean)
                                        : []

                            });

                        }
                    );

                }


                return;

            }


            /* =====================================
               NEW FEATURED PROVIDER
            ===================================== */

            bookingOptions.push({

                provider:
                    provider,

                logo:
                    featured.logo ||
                    null,

                official:
                    featured.official === true,

                link:
                    featured.link ||
                    null,

                num_guests:
                    Number(
                        featured.num_guests
                    ) || null,

                rate_per_night:
                    normalizeRate(
                        featured.rate_per_night
                    ),

                total_rate:
                    normalizeRate(
                        featured.total_rate
                    ),

                original_rate_per_night:
                    normalizeRate(
                        featured.original_rate_per_night
                    ),

                original_total_rate:
                    normalizeRate(
                        featured.original_total_rate
                    ),

                free_cancellation:
                    featured.free_cancellation === true,

                free_cancellation_until_date:
                    featured.free_cancellation_until_date ||
                    null,

                free_cancellation_until_time:
                    featured.free_cancellation_until_time ||
                    null,

                breakfast_included:
                    featured.breakfast_included === true,

                benefits:
                    featured.benefits ||
                    null,

                discount_remarks:
                    Array.isArray(
                        featured.discount_remarks
                    )
                        ? featured.discount_remarks
                        : [],

                rooms:
                    Array.isArray(
                        featured.rooms
                    )
                        ? featured.rooms
                            .map(
                                room => {

                                    if (!room) {
                                        return null;
                                    }


                                    return {

                                        name:
                                            room.name ||
                                            null,

                                        images:
                                            Array.isArray(
                                                room.images
                                            )
                                                ? room.images
                                                : [],

                                        link:
                                            room.link ||
                                            featured.link ||
                                            null,

                                        num_guests:
                                            Number(
                                                room.num_guests
                                            ) || null,

                                        rate_per_night:
                                            normalizeRate(
                                                room.rate_per_night
                                            ),

                                        total_rate:
                                            normalizeRate(
                                                room.total_rate
                                            ),

                                        original_rate_per_night:
                                            normalizeRate(
                                                room.original_rate_per_night
                                            ),

                                        original_total_rate:
                                            normalizeRate(
                                                room.original_total_rate
                                            ),

                                        free_cancellation:
                                            room.free_cancellation === true,

                                        free_cancellation_until_date:
                                            room.free_cancellation_until_date ||
                                            null,

                                        free_cancellation_until_time:
                                            room.free_cancellation_until_time ||
                                            null,

                                        breakfast_included:
                                            room.breakfast_included === true,

                                        beds:
                                            normalizeBeds(
                                                room.beds
                                            ),

                                        inclusions:
                                            Array.isArray(
                                                room.inclusions
                                            )
                                                ? room.inclusions
                                                : [],

                                        benefits:
                                            room.benefits ||
                                            null,

                                        rates:
                                            Array.isArray(
                                                room.rates
                                            )
                                                ? room.rates
                                                    .map(
                                                        rate =>
                                                            normalizeRateOption(
                                                                rate,
                                                                provider
                                                            )
                                                    )
                                                    .filter(Boolean)
                                                : []

                                    };

                                }
                            )
                            .filter(Boolean)
                        : [],

                rates:
                    Array.isArray(
                        featured.rates
                    )
                        ? featured.rates
                            .map(
                                rate =>
                                    normalizeRateOption(
                                        rate,
                                        provider
                                    )
                            )
                            .filter(Boolean)
                        : []

            });

        }
    );


    /* =============================================
       DEDUPLICATE ROOM OPTIONS
    ============================================= */

    bookingOptions.forEach(
        option => {

            const roomMap =
                new Map();


            option.rooms =
                option.rooms.filter(
                    room => {

                        const key =
                            [
                                room.name,
                                room.link,
                                room.total_rate
                                    ?.extracted_lowest
                            ]
                                .join("|");


                        if (
                            roomMap.has(key)
                        ) {

                            return false;

                        }


                        roomMap.set(
                            key,
                            true
                        );


                        return true;

                    }
                );


            const rateMap =
                new Map();


            option.rates =
                option.rates.filter(
                    rate => {

                        const key =
                            [
                                rate.link,
                                rate.room_name,
                                rate.total_rate
                                    ?.extracted_lowest
                            ]
                                .join("|");


                        if (
                            rateMap.has(key)
                        ) {

                            return false;

                        }


                        rateMap.set(
                            key,
                            true
                        );


                        return true;

                    }
                );

        }
    );


    /* =============================================
       REMOVE DUPLICATE PROVIDERS
    ============================================= */

    const providerMap =
        new Map();


    bookingOptions.forEach(
        option => {

            if (!option) {
                return;
            }


            const key =
                String(
                    option.provider ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (!key) {
                return;
            }


            if (
                !providerMap.has(key)
            ) {

                providerMap.set(
                    key,
                    option
                );

                return;

            }


            /*
               Merge additional room/rate data
               if the provider appeared in both
               prices and featured_prices.
            */

            const existing =
                providerMap.get(
                    key
                );


            existing.rooms.push(
                ...(option.rooms || [])
            );


            existing.rates.push(
                ...(option.rates || [])
            );


            if (
                !existing.logo &&
                option.logo
            ) {

                existing.logo =
                    option.logo;

            }


            if (
                !existing.link &&
                option.link
            ) {

                existing.link =
                    option.link;

            }

        }
    );


    let finalBookingOptions =
        Array.from(
            providerMap.values()
        );


    /* =============================================
       FINAL ROOM/RATE DEDUPLICATION
    ============================================= */

    finalBookingOptions.forEach(
        option => {

            const rooms =
                new Map();


            option.rooms =
                (option.rooms || [])
                    .filter(
                        room => {

                            const key =
                                [
                                    room.name,
                                    room.link,
                                    room.total_rate
                                        ?.extracted_lowest
                                ]
                                    .join("|");


                            if (
                                rooms.has(key)
                            ) {

                                return false;

                            }


                            rooms.set(
                                key,
                                true
                            );


                            return true;

                        }
                    );


            const rates =
                new Map();


            option.rates =
                (option.rates || [])
                    .filter(
                        rate => {

                            const key =
                                [
                                    rate.link,
                                    rate.room_name,
                                    rate.total_rate
                                        ?.extracted_lowest
                                ]
                                    .join("|");


                            if (
                                rates.has(key)
                            ) {

                                return false;

                            }


                            rates.set(
                                key,
                                true
                            );


                            return true;

                        }
                    );

        }
    );


    /* =============================================
       LOG PROVIDERS
    ============================================= */

    console.log(
        "BOOKING PROVIDERS FOUND:",
        finalBookingOptions.map(
            option =>
                option.provider
        )
    );


    console.log(
        "TOTAL BOOKING PROVIDERS:",
        finalBookingOptions.length
    );


    /* =============================================
       RETURN BOOKING DATA
    ============================================= */

    return res.status(200).json({

        success: true,

        property_token:
            propertyToken,

        hotel: {

            name:
                hotel.name ||
                null,

            address:
                hotel.address ||
                null,

            image:
                Array.isArray(
                    hotel.images
                ) &&
                hotel.images.length
                    ? hotel.images[0]
                    : null,

            images:
                Array.isArray(
                    hotel.images
                )
                    ? hotel.images
                    : [],

            rating:
                hotel.overall_rating ||
                hotel.rating ||
                null,

            reviews:
                hotel.reviews ||
                null

        },

        search: {

            check_in:
                checkIn,

            check_out:
                checkOut,

            adults:
                adults,

            children:
                children,

            rooms:
                rooms

        },

        booking_options:
            finalBookingOptions,

        booking_option_count:
            finalBookingOptions.length,

        search_metadata:
            data.search_metadata ||
            null

    });

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


    if (
        nextPageToken
    ) {

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
        process.env.SERPAPI_KEY
    );


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


    const response =
        await fetch(
            serpURL
        );


    const data =
        await response.json();


    console.log(
        "HOTEL REVIEWS STATUS:",
        response.status
    );


    console.log(
        "HOTEL REVIEWS RESPONSE:",
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
