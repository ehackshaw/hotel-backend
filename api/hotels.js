export default async function handler(req, res) {


    // CORS HEADERS
    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    // HANDLE PREFLIGHT
    if(req.method === "OPTIONS"){

        return res.status(200).json({
            success:true
        });

    }



    // ONLY ALLOW POST
    if(req.method !== "POST"){

        return res.status(405).json({

            error:"Method not allowed",
            method:req.method

        });

    }



    try{


        console.log(
            "REQUEST BODY:",
            req.body
        );


        const {
            destination,
            check_in,
            check_out,
            rooms,
            adults,
            children,
            seniors

        } = req.body;



        const serpUrl = new URL(
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
            "api_key",
            process.env.SERPAPI_KEY
        );



        console.log(
            "SERP URL:",
            serpUrl.toString()
        );



        const response = await fetch(
            serpUrl
        );



        const data = await response.json();



        console.log(
            "SERP DATA:",
            data
        );



        return res.status(200).json(data);



    }
    catch(error){


        console.log(
            "ERROR:",
            error
        );


        return res.status(500).json({

            error:"Hotel search failed",
            details:error.message

        });


    }


}
