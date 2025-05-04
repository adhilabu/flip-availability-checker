// data.js - Holds state and city data for the extension

const cityData = {
  "Andaman and Nicobar Islands": { tier1: [], tier2: ["Port Blair"] },
  "Andhra Pradesh": { tier1: [], tier2: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"] },
  "Arunachal Pradesh": { tier1: [], tier2: ["Itanagar"] },
  "Assam": { tier1: [], tier2: ["Guwahati", "Dibrugarh", "Silchar"] },
  "Bihar": { tier1: [], tier2: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"] },
  "Chandigarh": { tier1: [], tier2: ["Chandigarh"] },
  "Chhattisgarh": { tier1: [], tier2: ["Raipur", "Bhilai", "Bilaspur"] },
  "Dadra and Nagar Haveli and Daman and Diu": { tier1: [], tier2: ["Daman", "Silvassa"] },
  "Delhi": { tier1: ["Delhi"], tier2: [] },
  "Goa": { tier1: [], tier2: ["Panaji", "Margao"] },
  "Gujarat": { tier1: ["Ahmedabad"], tier2: ["Surat", "Vadodara", "Rajkot", "Bhavnagar"] },
  "Haryana": { tier1: [], tier2: ["Faridabad", "Gurugram", "Panipat", "Ambala"] }, // Gurugram formerly Gurgaon
  "Himachal Pradesh": { tier1: [], tier2: ["Shimla"] },
  "Jammu and Kashmir": { tier1: [], tier2: ["Srinagar", "Jammu"] },
  "Jharkhand": { tier1: [], tier2: ["Jamshedpur", "Dhanbad", "Ranchi", "Bokaro Steel City"] },
  "Karnataka": { tier1: ["Bengaluru"], tier2: ["Mysore", "Mangalore", "Hubli-Dharwad", "Belgaum"] }, // Bengaluru formerly Bangalore
  "Kerala": { tier1: [], tier2: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"] },
  "Ladakh": { tier1: [], tier2: ["Leh"] },
  "Lakshadweep": { tier1: [], tier2: ["Kavaratti"] },
  "Madhya Pradesh": { tier1: [], tier2: ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"] },
  "Maharashtra": { tier1: ["Mumbai", "Pune"], tier2: ["Nagpur", "Nashik", "Aurangabad", "Thane", "Navi Mumbai", "Solapur"] },
  "Manipur": { tier1: [], tier2: ["Imphal"] },
  "Meghalaya": { tier1: [], tier2: ["Shillong"] },
  "Mizoram": { tier1: [], tier2: ["Aizawl"] },
  "Nagaland": { tier1: [], tier2: ["Dimapur", "Kohima"] },
  "Odisha": { tier1: [], tier2: ["Bhubaneswar", "Cuttack", "Rourkela"] },
  "Puducherry": { tier1: [], tier2: ["Puducherry"] },
  "Punjab": { tier1: [], tier2: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"] },
  "Rajasthan": { tier1: [], tier2: ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer"] },
  "Sikkim": { tier1: [], tier2: ["Gangtok"] },
  "Tamil Nadu": { tier1: ["Chennai"], tier2: ["Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode"] },
  "Telangana": { tier1: ["Hyderabad"], tier2: ["Warangal", "Nizamabad", "Karimnagar"] },
  "Tripura": { tier1: [], tier2: ["Agartala"] },
  "Uttar Pradesh": { tier1: [], tier2: ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Prayagraj", "Ghaziabad", "Noida"] }, // Prayagraj formerly Allahabad
  "Uttarakhand": { tier1: [], tier2: ["Dehradun", "Haridwar"] },
  "West Bengal": { tier1: ["Kolkata"], tier2: ["Asansol", "Siliguri", "Durgapur"] }
};

// Representative pincodes for Tier 1/2 cities (Central/Main Pincode preferred)
const pincodeData = {
    "Port Blair": "744101",
    "Visakhapatnam": "530001",
    "Vijayawada": "520001",
    "Guntur": "522001",
    "Nellore": "524001",
    "Itanagar": "791111",
    "Guwahati": "781001",
    "Dibrugarh": "786001",
    "Silchar": "788001",
    "Patna": "800001",
    "Gaya": "823001",
    "Bhagalpur": "812001",
    "Muzaffarpur": "842001",
    "Chandigarh": "160017", // Sector 17 is central
    "Raipur": "492001",
    "Bhilai": "490001", // Bhilai Steel Plant area
    "Bilaspur": "495001",
    "Daman": "396210",
    "Silvassa": "396230",
    "Delhi": "110001", // Connaught Place area
    "Panaji": "403001",
    "Margao": "403601",
    "Ahmedabad": "380001", // Lal Darwaja area
    "Surat": "395003", // Main city area
    "Vadodara": "390001",
    "Rajkot": "360001",
    "Bhavnagar": "364001",
    "Faridabad": "121001",
    "Gurugram": "122001",
    "Panipat": "132103",
    "Ambala": "134003", // Ambala Cantt
    "Shimla": "171001",
    "Srinagar": "190001",
    "Jammu": "180001",
    "Jamshedpur": "831001",
    "Dhanbad": "826001",
    "Ranchi": "834001",
    "Bokaro Steel City": "827001",
    "Bengaluru": "560001", // MG Road area
    "Mysore": "570001",
    "Mangalore": "575001",
    "Hubli-Dharwad": "580020", // Hubli area
    "Belgaum": "590001",
    "Kochi": "682001", // Ernakulam area
    "Thiruvananthapuram": "695001",
    "Kozhikode": "673001",
    "Thrissur": "680001",
    "Leh": "194101",
    "Kavaratti": "682555",
    "Indore": "452001",
    "Bhopal": "462001",
    "Jabalpur": "482001",
    "Gwalior": "474001",
    "Ujjain": "456001",
    "Mumbai": "400001", // Fort area
    "Pune": "411001", // Pune GPO area
    "Nagpur": "440001",
    "Nashik": "422001",
    "Aurangabad": "431001",
    "Thane": "400601",
    "Navi Mumbai": "400703", // Vashi area
    "Solapur": "413001",
    "Imphal": "795001",
    "Shillong": "793001",
    "Aizawl": "796001",
    "Dimapur": "797112",
    "Kohima": "797001",
    "Bhubaneswar": "751001",
    "Cuttack": "753001",
    "Rourkela": "769001",
    "Puducherry": "605001",
    "Ludhiana": "141001",
    "Amritsar": "143001",
    "Jalandhar": "144001",
    "Patiala": "147001",
    "Jaipur": "302001",
    "Jodhpur": "342001",
    "Kota": "324001",
    "Bikaner": "334001",
    "Ajmer": "305001",
    "Gangtok": "737101",
    "Chennai": "600001", // Chennai GPO area
    "Coimbatore": "641001",
    "Madurai": "625001",
    "Tiruchirappalli": "620001",
    "Salem": "636001",
    "Tiruppur": "641601",
    "Erode": "638001",
    "Hyderabad": "500001", // Hyderabad GPO area
    "Warangal": "506002", // Warangal HO area
    "Nizamabad": "503001",
    "Karimnagar": "505001",
    "Agartala": "799001",
    "Lucknow": "226001", // Lucknow GPO area
    "Kanpur": "208001",
    "Agra": "282001",
    "Varanasi": "221001",
    "Meerut": "250001",
    "Prayagraj": "211001",
    "Ghaziabad": "201001",
    "Noida": "201301",
    "Dehradun": "248001",
    "Haridwar": "249401",
    "Kolkata": "700001", // Kolkata GPO area
    "Asansol": "713301",
    "Siliguri": "734001",
    "Durgapur": "713201"
};