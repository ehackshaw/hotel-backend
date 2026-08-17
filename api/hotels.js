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
   SHARED HELPERS
================================================= */

/*
   Google Hotels can return providers with slightly
   different names.

   Normalize them so Booking.com / Booking / Expedia
   are consistently identified.
*/

function normalizeProviderName(
    provider
) {

    if (!provider) {

        return null;

    }


    const value =
        String(provider)
            .trim();


    const lower =
        value.toLowerCase();


    if (
        lower.includes("booking.com") ||
        lower === "booking" ||
        lower.includes("bookingcom")
    ) {

        return "Booking.com";

    }


    if (
        lower.includes("expedia")
    ) {

        return "Expedia";

    }


    if (
        lower.includes("hotels.com")
    ) {

        return "Hotels.com";

    }


    if (
        lower.includes("agoda")
    ) {

        return "Agoda";

    }


    return value;

}


/* =================================================
   RATE NORMALIZER
================================================= */

function normalizeRate(
    rate
) {

    if (!rate) {

        return null;

    }


    const extractedLowest =
        Number(
            rate.extracted_lowest
        );


    const extractedBeforeTaxesFees =
        Number(
            rate.extracted_before_taxes_fees
        );


    return {

        lowest:
            rate.lowest ||
            null,

        extracted_lowest:
            Number.isFinite(
                extractedLowest
            )
                ? extractedLowest
                : null,

        before_taxes_fees:
            rate.before_taxes_fees ||
            null,

        extracted_before_taxes_fees:
            Number.isFinite(
                extractedBeforeTaxesFees
            )
                ? extractedBeforeTaxesFees
                : null

    };

}


/* =================================================
   BEDS NORMALIZER
================================================= */

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


/* =================================================
   RATE OPTION NORMALIZER
================================================= */

function normalizeRateOption(
    rate,
    providerName
) {

    if (!rate) {

        return null;

    }


    return {

        provider:
            normalizeProviderName(
                providerName
            ),

        link:
            rate.link ||
            rate.booking_link ||
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


/* =================================================
   ROOM NORMALIZER
================================================= */

function normalizeRoom(
    room,
    providerName,
    fallbackLink
) {

    if (!room) {

        return null;

    }


    const provider =
        normalizeProviderName(
            providerName
        );


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
            fallbackLink ||
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


/* =================================================
   PROVIDER OPTION BUILDER
================================================= */

function buildProviderOption(
    source,
    providerOverride = null
) {

    if (!source) {

        return null;

    }


    const provider =
        normalizeProviderName(
            providerOverride ||
            source.source ||
            source.provider ||
            source.name
        );


    if (!provider) {

        return null;

    }


    const option = {

        provider:
            provider,

        original_provider_name:
            source.source ||
            source.provider ||
            null,

        logo:
            source.logo ||
            source.source_icon ||
            null,

        official:
            source.official === true,

        sponsored:
            source.sponsored === true,

        link:
            source.link ||
            source.booking_link ||
            null,

        num_guests:
            Number(
                source.num_guests
            ) || null,

        rate_per_night:
            normalizeRate(
                source.rate_per_night
            ),

        total_rate:
            normalizeRate(
                source.total_rate
            ),

        original_rate_per_night:
            normalizeRate(
                source.original_rate_per_night
            ),

        original_total_rate:
            normalizeRate(
                source.original_total_rate
            ),

        free_cancellation:
            source.free_cancellation === true,

        free_cancellation_until_date:
            source.free_cancellation_until_date ||
            null,

        free_cancellation_until_time:
            source.free_cancellation_until_time ||
            null,

        breakfast_included:
            source.breakfast_included === true,

        benefits:
            source.benefits ||
            null,

        discount_remarks:
            Array.isArray(
                source.discount_remarks
            )
                ? source.discount_remarks
                : [],

        rooms:
            [],

        rates:
            []

    };


    /* =============================================
       DIRECT RATES
    ============================================= */

    if (
        Array.isArray(
            source.rates
        )
    ) {

        option.rates =
            source.rates
                .map(
                    rate =>
                        normalizeRateOption(
                            rate,
                            provider
                        )
                )
                .filter(Boolean);

    }


    /* =============================================
       ROOMS
    ============================================= */

    if (
        Array.isArray(
            source.rooms
        )
    ) {

        option.rooms =
            source.rooms
                .map(
                    room =>
                        normalizeRoom(
                            room,
                            provider,
                            source.link
                        )
                )
                .filter(Boolean);

    }


    return option;

}


/* =================================================
   MERGE PROVIDER OPTIONS
================================================= */

function mergeProviderOptions(
    existing,
    incoming
) {

    if (!existing) {

        return incoming;

    }


    if (!incoming) {

        return existing;

    }


    if (
        !existing.logo &&
        incoming.logo
    ) {

        existing.logo =
            incoming.logo;

    }


    if (
        !existing.link &&
        incoming.link
    ) {

        existing.link =
            incoming.link;

    }


    if (
        incoming.official
    ) {

        existing.official =
            true;

    }


    if (
        incoming.sponsored
    ) {

        existing.sponsored =
            true;

    }


    if (
        !existing.rate_per_night &&
        incoming.rate_per_night
    ) {

        existing.rate_per_night =
            incoming.rate_per_night;

    }


    if (
        !existing.total_rate &&
        incoming.total_rate
    ) {

        existing.total_rate =
            incoming.total_rate;

    }


    if (
        !existing.original_rate_per_night &&
        incoming.original_rate_per_night
    ) {

        existing.original_rate_per_night =
            incoming.original_rate_per_night;

    }


    if (
        !existing.original_total_rate &&
        incoming.original_total_rate
    ) {

        existing.original_total_rate =
            incoming.original_total_rate;

    }


    if (
        !existing.free_cancellation &&
        incoming.free_cancellation
    ) {

        existing.free_cancellation =
            true;

    }


    if (
        !existing.breakfast_included &&
        incoming.breakfast_included
    ) {

        existing.breakfast_included =
            true;

    }


    if (
        !existing.benefits &&
        incoming.benefits
    ) {

        existing.benefits =
            incoming.benefits;

    }


    existing.rooms.push(
        ...(incoming.rooms || [])
    );


    existing.rates.push(
        ...(incoming.rates || [])
    );


    return existing;

}


/* =================================================
   DEDUPLICATE PROVIDER ROOMS/RATES
================================================= */

function deduplicateProvider(
    option
) {

    if (!option) {

        return option;

    }


    const roomMap =
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
                                ?.extracted_lowest,
                            room.rate_per_night
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
        (option.rates || [])
            .filter(
                rate => {

                    const key =
                        [
                            rate.link,
                            rate.room_name,
                            rate.total_rate
                                ?.extracted_lowest,
                            rate.rate_per_night
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


    return option;

}


/* =================================================
   BUILD ALL BOOKING OPTIONS
================================================= */

function extractBookingOptions(
    data,
    propertyToken
) {

    const providerMap =
        new Map();


    function addProvider(
        source,
        providerOverride = null
    ) {

        if (!source) {

            return;

        }


        const option =
            buildProviderOption(
                source,
                providerOverride
            );


        if (!option) {

            return;

        }


        const key =
            String(
                option.provider
            )
                .trim()
                .toLowerCase();


        if (
            providerMap.has(key)
        ) {

            const existing =
                providerMap.get(
                    key
                );


            providerMap.set(
                key,
                mergeProviderOptions(
                    existing,
                    option
                )
            );

        } else {

            providerMap.set(
                key,
                option
            );

        }

    }


    /* =============================================
       PROPERTY
    ============================================= */

    const hotel =
        data.property ||
        data;


    /* =============================================
       PROPERTY PRICES
    ============================================= */

    if (
        Array.isArray(
            hotel.prices
        )
    ) {

        hotel.prices.forEach(
            price => {

                addProvider(
                    price
                );

            }
        );

    }


    /* =============================================
       FEATURED PRICES
    ============================================= */

    if (
        Array.isArray(
            hotel.featured_prices
        )
    ) {

        hotel.featured_prices.forEach(
            featured => {

                addProvider(
                    featured
                );

            }
        );

    }


    /* =============================================
       ADS

       Google Hotels can expose booking providers
       in the ads array.

       Only add an ad when it belongs to the
       requested property when property_token is
       available.
    ============================================= */

    if (
        Array.isArray(
            data.ads
        )
    ) {

        data.ads.forEach(
            ad => {

                if (!ad) {

                    return;

                }


                if (
                    ad.property_token &&
                    propertyToken &&
                    String(
                        ad.property_token
                    ) !== String(
                        propertyToken
                    )
                ) {

                    return;

                }


                addProvider(
                    ad
                );

            }
        );

    }


    /* =============================================
       PROPERTY-LEVEL BOOKING SOURCES

       Some responses can contain additional
       provider structures. Check common arrays
       without assuming they exist.
    ============================================= */

    const additionalProviderArrays = [

        "booking_options",

        "booking_providers",

        "offers",

        "rates"

    ];


    additionalProviderArrays.forEach(
        arrayName => {

            if (
                Array.isArray(
                    hotel[arrayName]
                )
            ) {

                hotel[arrayName].forEach(
                    provider => {

                        addProvider(
                            provider
                        );

                    }
                );

            }

        }
    );


    /* =============================================
       FINALIZE
    ============================================= */

    const finalOptions =
        Array.from(
            providerMap.values()
        )
            .map(
                option =>
                    deduplicateProvider(
                        option
                    )
            )
            .filter(
                option =>
                    option &&
                    (
                        option.link ||
                        option.total_rate ||
                        option.rate_per_night ||
                        option.rooms.length ||
                        option.rates.length
                    )
            );


    return finalOptions;

}


/* =================================================
   PROVIDER STATUS
================================================= */

function buildProviderStatus(
    bookingOptions
) {

    const names =
        bookingOptions.map(
            option =>
                String(
                    option.provider ||
                    ""
                )
                    .toLowerCase()
        );


    const booking =
        names.some(
            name =>
                name.includes(
                    "booking.com"
                )
        );


    const expedia =
        names.some(
            name =>
                name.includes(
                    "expedia"
                )
        );


    return {

        booking_com: {

            available:
                booking,

            message:
                booking
                    ? "Booking.com returned an offer for this hotel/search."
                    : "Booking.com was not returned by Google Hotels for this hotel/search."

        },

        expedia: {

            available:
                expedia,

            message:
                expedia
                    ? "Expedia returned an offer for this hotel/search."
                    : "Expedia was not returned by Google Hotels for this hotel/search."

        }

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
       IMPORTANT:

       Send the exact booking search parameters
       when available so Google Hotels can return
       provider prices for the actual stay.
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
        "FETCHING HOTEL DETAILS"
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


    if (
        !response.ok ||
        data.error
    ) {

        console.error(
            "HOTEL DETAILS ERROR:",
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


    const hotel =
        data.property ||
        data;


    const bookingOptions =
        extractBookingOptions(
            data,
            propertyToken
        );


    console.log(
        "DETAILS BOOKING PROVIDERS:",
        bookingOptions.map(
            option =>
                option.provider
        )
    );


    return res.status(200).json({

        success: true,

        property_token:
            propertyToken,

        hotel:
            hotel,

        booking_options:
            bookingOptions,

        booking_option_count:
            bookingOptions.length,

        provider_status:
            buildProviderStatus(
                bookingOptions
            ),

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

        search_metadata:
            data.search_metadata ||
            null

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


    const hotel =
        data.property ||
        data;


    const finalBookingOptions =
        extractBookingOptions(
            data,
            propertyToken
        );


    console.log(
        "================================="
    );

    console.log(
        "BOOKING PROVIDERS FOUND:",
        finalBookingOptions.map(
            option =>
                option.provider
        )
    );

    console.log(
        "BOOKING PROVIDER COUNT:",
        finalBookingOptions.length
    );

    console.log(
        "PROVIDER STATUS:",
        buildProviderStatus(
            finalBookingOptions
        )
    );

    console.log(
        "================================="
    );


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

            description:
                hotel.description ||
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

        provider_status:
            buildProviderStatus(
                finalBookingOptions
            ),

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


/* =================================================
   HOTEL SEARCH LOGGING
================================================= */

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


    /*
       English response.
    */

    serpURL.searchParams.set(
        "hl",
        "en"
    );


    /*
       US Google Hotels results are generally
       useful for international booking providers.
       This can be overridden by the frontend
       by passing gl.
    */

    if (
        inputData.gl
    ) {

        serpURL.searchParams.set(
            "gl",
            String(
                inputData.gl
            )
        );

    }


    if (
        inputData.currency
    ) {

        serpURL.searchParams.set(
            "currency",
            String(
                inputData.currency
            )
        );

    }


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
   GET FIRST HOTEL RESULTS
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


/*
   Pull additional result pages.

   Increased from 2 to 4 additional pages so
   more hotels are returned when pagination is
   available.
*/

while (
    nextPageToken &&
    page < 4
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

        if (!hotel) {

            return;

        }


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
   FINAL HOTEL RESPONSE
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


/* =================================================
   ERROR HANDLER
================================================= */

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
