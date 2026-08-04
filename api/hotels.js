export default async function handler(req,res){

console.log("METHOD:", req.method);

console.log("BODY:", req.body);


if(req.method !== "POST"){

return res.status(405).json({
error:"Method not allowed"
});

}


try{


console.log("HOTEL REQUEST BODY:", req.body);



const {
destination,
check_in,
check_out,
rooms,
adults,
children,
seniors

}=req.body;



if(!destination){

return res.status(400).json({
error:"Missing destination"
});

}



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
check_in.split("T")[0]
);


serpUrl.searchParams.set(
"check_out_date",
check_out.split("T")[0]
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
"SERP URL CREATED"
);



const response = await fetch(
serpUrl.toString()
);



console.log(
"SERP STATUS:",
response.status
);



const data = await response.json();



console.log(
"SERP RESPONSE KEYS:",
Object.keys(data)
);



return res.status(200).json(data);



}
catch(error){


console.log(
"HOTEL ERROR:",
error
);


return res.status(500).json({

error:"Hotel search failed",
details:error.message

});


}


}
