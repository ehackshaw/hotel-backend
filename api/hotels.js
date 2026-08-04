export default async function handler(req, res) {


if(req.method !== "POST"){

return res.status(405).json({
error:"Method not allowed"
});

}



try{


const {
destination,
check_in,
check_out,
rooms,
adults,
children,
seniors

}=req.body;



const serpUrl = new URL(
"https://serpapi.com/search"
);



serpUrl.searchParams.append(
"engine",
"google_hotels"
);


serpUrl.searchParams.append(
"q",
destination
);


serpUrl.searchParams.append(
"check_in_date",
check_in.split("T")[0]
);


serpUrl.searchParams.append(
"check_out_date",
check_out.split("T")[0]
);


serpUrl.searchParams.append(
"adults",
adults || 1
);


serpUrl.searchParams.append(
"children",
children || 0
);


serpUrl.searchParams.append(
"rooms",
rooms || 1
);


serpUrl.searchParams.append(
"api_key",
process.env.SERPAPI_KEY
);



const response = await fetch(
serpUrl
);


const data = await response.json();



res.status(200).json(data);



}
catch(error){


console.log(error);

console.log("SERP HOTEL RESPONSE:", JSON.stringify(data,null,2));
res.status(500).json({

error:"Hotel search failed"

});


}


}
