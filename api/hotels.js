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





        async function fetchHotels(pageToken=null){


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



            if(pageToken){

                serpUrl.searchParams.set(
                    "next_page_token",
                    pageToken
                );

            }



            serpUrl.searchParams.set(
                "api_key",
                process.env.SERPAPI_KEY
            );



            const response = await fetch(
                serpUrl
            );


            return await response.json();


        }





        let allHotels = [];



        // FIRST PAGE

        let data = await fetchHotels();



        console.log(
            "FIRST SERP DATA:",
            data
        );



        if(data.properties){

            allHotels.push(
                ...data.properties
            );

        }





        let nextPageToken =
        data.serpapi_pagination?.next_page_token;



        let page = 0;




        // GET MORE PAGES

        while(
            nextPageToken &&
            page < 5
        ){


            let nextData =
            await fetchHotels(
                nextPageToken
            );



            console.log(
                "NEXT PAGE DATA:",
                nextData
            );



            if(nextData.properties){

                allHotels.push(
                    ...nextData.properties
                );

            }



            nextPageToken =
            nextData.serpapi_pagination?.next_page_token;



            page++;


        }





        console.log(
            "TOTAL HOTELS FOUND:",
            allHotels.length
        );






        // ==================================
        // GOOGLE PLACES EXACT ADDRESS LOOKUP
        // ==================================


        const hotelsWithAddresses =
        await Promise.all(


            allHotels.map(async(hotel)=>{


                try{


                    const placeResponse =
                    await fetch(

                        "https://places.googleapis.com/v1/places:searchText",

                        {

                            method:"POST",


                            headers:{

                                "Content-Type":
                                "application/json",


                                "X-Goog-Api-Key":
                                process.env.GOOGLE_PLACES_KEY,


                                "X-Goog-FieldMask":
                                "places.formattedAddress,places.id"

                            },


                            body:JSON.stringify({

                                textQuery:
                                `${hotel.name} ${destination}`

                            })


                        }

                    );



                    const placeData =
                    await placeResponse.json();




                    if(
                        placeData.places &&
                        placeData.places.length
                    ){


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
                catch(error){


                    console.log(
                        "GOOGLE PLACE ERROR:",
                        error.message
                    );


                }



                return hotel;



            })

        );





        return res.status(200).json({

            properties: hotelsWithAddresses

        });




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
