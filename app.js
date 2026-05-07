require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

// --- SCHEMAS ---
const userschema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const motiveschema = new mongoose.Schema({
    content: { type: String, required: true },
    source: { type: String, required: true }
}, { timestamps: true });

const apischema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    requestsmade: { type: Number, default: 0 },
    resettime: { type: Number, required: true },
    limit: { type: Number, required: true } // This acts as the "remaining" balance
});

const Motive = mongoose.model("Motive", motiveschema);
const User = mongoose.model("User", userschema);
const Api = mongoose.model("Api", apischema);

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Manual Tracking & Rate Limiting Logic
const trackinglogic = async (req, res, next) => {
    try {
        const key = req.headers['x-api-key'];
        if (!key) return res.status(401).json({ message: "API Key required in x-api-key header" });

        const apikey = await Api.findOne({ key });
        if (!apikey) return res.status(403).json({ message: "Invalid API Key" });

        const now = Date.now();
        const WINDOW_MS = 15 * 60 * 1000; // 15 Minutes

        // If current time has passed the reset window, reset the limit
        if (now > apikey.resettime) {
            apikey.limit = 5; // Set your desired max requests per window here
            apikey.resettime = now + WINDOW_MS;
        }

        // Check if user has exhausted their limit for the current window
        if (apikey.limit <= 0) {
            return res.status(429).json({ 
                message: "Rate limit exceeded", 
                resetsAt: new Date(apikey.resettime).toLocaleString() 
            });
        }

        // Decrement limit and increment total requests
        apikey.limit -= 1;
        apikey.requestsmade += 1;
        await apikey.save();

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error during tracking" });
    }
};

// 2. Authentication Middleware
function authmiddleware(req, res, next) {
    const authheader = req.headers.authorization;
    if (!authheader) return res.status(401).json({ message: "No token provided" });

    const token = authheader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid or expired token" });
        req.user = decoded;
        next();
    });
}

// --- ROUTES ---

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Invalid credentials" });

        const validatename = username.trim().toLowerCase();
        const existingUser = await User.findOne({ username: validatename });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // Generate API Key (Using let so we can regenerate if duplicate exists)
        let apikey = crypto.randomBytes(16).toString('hex');
        const hashedpassword = await bcrypt.hash(password, 10);

        await User.create({ username: validatename, password: hashedpassword });
        
        // Initialize API record
        await Api.create({
            key: apikey,
            owner: validatename,
            requestsmade: 0,
            resettime: Date.now() + (15 * 60 * 1000),
            limit: 5 // Initial limit
        });

        const token = jwt.sign({ username: validatename }, JWT_SECRET);
        return res.status(200).json({ message: `User created successfully`, apikey, token });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error during registration" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const validatename = username.trim().toLowerCase();

        const user = await User.findOne({ username: validatename });
        if (!user) return res.status(400).json({ message: "User doesn't exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const apikeyData = await Api.findOne({ owner: validatename });
        const token = jwt.sign({ username: validatename, id: user._id }, JWT_SECRET);

        res.status(200).json({ 
            message: "Logged in successfully", 
            token, 
            apiKey: apikeyData?.key 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Login error" });
    }
});

app.get("/motivation", authmiddleware, trackinglogic, async (req, res) => {
    const motivations = await Motive.find();
    if (!motivations || motivations.length === 0) return res.status(404).json({ message: "No motivations found" });
    
    return res.status(200).json({ motivations });
});

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`App running on PORT: ${PORT}`));
    })
    .catch((err) => console.log(err));









    



// require('dotenv').config()
// const { urlencoded } = require('body-parser');
// const express=require('express');
// const mongoose=require('mongoose');
// const JWT_SECRET=process.env.JWT_SECRET;
// const PORT=process.env.PORT||5000;
// const Schema=mongoose.Schema;
// const bcrypt=require('bcrypt')
// const jwt=require("jsonwebtoken")
// const {rateLimit}=require('express-rate-limit');
// const crypto=require('crypto')
// const app=express();


// const userschema=new Schema({
//   username:{type:String,required:true,unique:true},
//   password:{type:String , required:true}
// });

// const motiveschema=new Schema({
//     content:{type: String, required: true},
//     source:{type: String, required:true}
// },{timestamps:true});

// const apischema=new Schema({
//     key :{type:String , required: true},
//     owner:{type:String,required:true },
//     requestsmade:{type:Number, required:true},
//     resettime:{type:Number},
//     limit:{type:Number,required:true}
// })

// const Motive=mongoose.model("Motive",motiveschema);
// const User=mongoose.model("User",userschema);
// const Api=mongoose.model("Api",apischema)

// app.use(express.json());
// app.use(express.urlencoded({extended:true}));
// // app.use(rateLimit({message:{error:"Too many requests"}}));
// app.set("proxy",1);


// mongoose.connect(process.env.MONGODB_URL)
// .then(()=>{console.log("MongoDB connected"),app.listen(PORT,()=>{console.log(`App running on PORT: ${PORT}`)})})
// .catch((err)=>console.log(err));

// const limiter =rateLimit({
// 	windowMs: 15 * 60 * 1000, // 15 minutes

//     max:async (req,res)=>{
//         const key=req.headers['x-api-key'];
//         if(!key) return res.status(401).json({message:"Error, Check Api key"})
//         const apikey=await Api.findOne({key});
//         if(!apikey) return res.status(400).json({message:"Error ,Check Api key"})
//         return apikey?.limit||2;
//         const now=new Date();
//         const limited=now.setMinutes(now.getMinutes()+windowMs)
//         apikey.resettime=limited
//         await apikey.save()
//     },
//     keyGenerator:(req,res)=>{
//         return req.headers['x-api-key'];
//     },
//     message:{error:'Too many requests , API key exceeded'},
//     standardHeaders:true,
//     legacyHeaders:false
// })

// const trackinglogic=async (req,res,next)=>{
//         const key=req.headers['x-api-key'];
//         if(!key) return res.status(401).json({message:"Error, Check Api key"})
//         const apikey=await Api.findOne({key});
//         if(!apikey) return res.status(400).json({message:"Error ,Check Api key"})
//             apikey.requestsmade+=1;
//         apikey.limit-=1;
// await apikey.save()
// next()
// }

// function authmiddleware(req,res,next){
// try {
//   const authheader=req.headers.authorization;  
//   if(!authheader) return res.status(401);
//   const token=authheader.split(" ") [1];
//   jwt.verify(token,JWT_SECRET,(err,decoded)=>{
//     if(err) return res.status(403).json({message:err});
//     req.user=decoded;
//     return next();
//   })
// } catch (error) {
//     console.log(error)
//     return res.status(403).json({message:"Invalid credentials"});
// }
// }

// app.post('/register',async(req,res)=>{
// try {
//         const {username,password,email}=req.body;
//         const validatename=username.trim().toLowerCase();
//         const apikey=crypto.randomBytes(16).toString('hex');
//     let ip; 
//     if(!username||!password) return res.status(400).json({message:"Invalid credentials"});
//     const finduser=await User.findOne({username:validatename});
//     const checkfornoduplicate=await Api.findOne({key:apikey})
//     if(checkfornoduplicate){
//     apikey=crypto.randomBytes(16).toString("hex");
//     }
//     if(finduser) return res.status(400).json({message:"User already exists"});

//     // if()
//     const hashedpassword=await bcrypt.hash(password,10);
//     const token=jwt.sign({username,apikey},JWT_SECRET);
//     await User.create({username:username,password:hashedpassword,email});
//     await Api.create({key:apikey,owner:validatename,requestsmade:0,resettime:15 * 60 * 1000,limit:3})

//     return res.status(200).json({message:`User: ${username} created successfully`,token});


//     //     key :{type:String , required: true},
//     // owner:{type:String,required:true },
//     // requestsmade:{type:String, required:true},
//     // resettime:{type:String , required:true},
//     // limit:{}

// } catch (err) {
//        console.log(err)
//     return res.status(500).json({message:err})
 
// }
// })

// app.post('/login',async (req,res)=>{
// try {
//     const {username, password}=req.body;
//     const validatename=username.trim().toLowerCase();
//     if(!username||!password) return res.status(400).json({message:"All params must be valid"})
//     const user=await User.findOne({username:validatename});
//     const apikeysource=await Api.findone({owner:validatename})
//     if(!user) return res.status(400).json({message:"User doesn't exist"});
//     const compare=await bcrypt.compare(password,user.password);
//     if(!compare) return res.status(400).json({message:"invalid credentials"});
//     const token=jwt.sign({username:validatename,id:user._id},JWT_SECRET);
//     res.status(200).json({message:`${username} logged in successfully`,token})
//     // token=
    
// } catch (error) {
//    return res.status(500).json({message:err})
// }
// });


// app.post('/populatedb',authmiddleware,async (req,res)=>{
// try {
//     // const {content}=req.body;
//     const {motivations}=req.body;
//     if(!motivations) return res.status(400).json({message:"Nothing to be added"})
//     motivations.forEach(async m=> {
//      const existingcontent=await Motive.findOne({content:m.content});
//      if(existingcontent)  console.log(`"${existingcontent}" already exists in the db , skipping`);
//      else{
//         await Motive.create({content:m.content,source:m.source});
        
//      }
//     })
//     return res.status(200).json({message:"DB populated"})
    
// } catch (error) {
//     return res.status(400).json({message:error})
// }
// })

// app.get('/check',authmiddleware,(req,res)=>{
// console.log(req.user)
// res.end()
// })

// app.get("/motivation",authmiddleware,limiter,trackinglogic,async (req,res,next)=>{
// // considering whether get motivation should be a post request
// const motivations=await Motive.find();
// if(!motivations) return res.status(400).json({message:"No motivations"});
// console.log(req.ip)
// return res.status(200).json({motivations})
// })

// app.use((req,res)=>{
//     return res.status(404).json("Route doesn't exist")
// })

// //check pimit for documentations
// //Extra jagons
// 	//limit: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
// 	//standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
// 	//legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// 	// ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
//     // keygenerator:(req,res)=>{
//     //     // ipKeyGenerator(req.ip)
//     //     if(userIsAuthenticate(req)){
//     //         return req.userId||req.username
//     //     }
//     //     return ipKeyGenerator(req.ip,60)
//     // }
//     // keyGenerator