require('dotenv').config()
const { urlencoded } = require('body-parser');
const express=require('express');
const mongoose=require('mongoose');
const JWT_SECRET=process.env.JWT_SECRET;
const PORT=process.env.PORT||5000;
const Schema=mongoose.Schema;
const bcrypt=require('bcrypt')
const jwt=require("jsonwebtoken")
const {rateLimit}=require('express-rate-limit');
const crypto=require('crypto')
const app=express();


const userschema=new Schema({
  username:{type:String,required:true,unique:true},
  password:{type:String , required:true}
});

const motiveschema=new Schema({
    content:{type: String, required: true},
    source:{type: String, required:true}
},{timestamps:true});

const apischema=new Schema({
    key :{type:String , required: true},
    owner:{type:String,required:true },
    requestsmade:{type:String, required:true},
    resettime:{type:String , required:true},
    limit:{}
})

const Motive=mongoose.model("Motive",motiveschema);
const User=mongoose.model("User",userschema);
const Api=mongoose.model("Api",apischema)

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(rateLimit({message:{error:"Too many requests"}}));
app.set("proxy",1);


mongoose.connect(process.env.MONGODB_URL)
.then(()=>{console.log("MongoDB connected"),app.listen(PORT,()=>{console.log(`App running on PORT: ${PORT}`)})})
.catch((err)=>console.log(err));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
    // keygenerator:(req,res)=>{
    //     // ipKeyGenerator(req.ip)
    //     if(userIsAuthenticate(req)){
    //         return req.userId||req.username
    //     }
    //     return ipKeyGenerator(req.ip,60)
    // }
    // keyGenerator
})

function authmiddleware(req,res,next){
try {
  const authheader=req.headers.authorization;  
  if(!authheader) return res.status(401);
  const token=authheader.split(" ") [1];
  jwt.verify(token,JWT_SECRET,(err,decoded)=>{
    if(err) return res.status(403).json({message:err});
    req.user=decoded;
    return next();
  })
} catch (error) {
    console.log(error)
    return res.status(403).json({message:"Invalid credentials"});
}
}

app.post('/register',async(req,res)=>{
try {
        const {username,password,email}=req.body;
        const validatename=username.trim().toLowerCase();
        const apikey=crypto.randomBytes(16).toString('hex');
    let ip; 
    if(!username||!password) return res.status(400).json({message:"Invalid credentials"});
    const finduser=await User.findOne({username:validatename});
    const checkfornoduplicate=await Api.findOne({key:apikey})
    if(checkfornoduplicate){
    apikey=crypto.randomBytes(16).toString("hex");
    }
    if(finduser) return res.status(400).json({message:"User already exists"});

    // if()
    const hashedpassword=await bcrypt.hash(password,10);
    const token=jwt.sign({username,apikey},JWT_SECRET);
    await User.create({username:username,password:hashedpassword,email});
    await Api.create({key:apikey,owner:validatename,requestsmade:0,resettime:0})
    //     requestsmade:{type:String, required:true},
    // resettime:{type:String , required:true},
    // limit:{}
    return res.status(200).json({message:`User: ${username} created successfully`,token});


} catch (err) {
       console.log(err)
    return res.status(500).json({message:err})
 
}
})

app.post('/login',async (req,res)=>{
try {
    const {username, password}=req.body;
    const validatename=username.trim().toLowerCase();
    if(!username||!password) return res.status(400).json({message:"All params must be valid"})
    const user=await User.findOne({username:validatename});
    if(!user) return res.status(400).json({message:"User doesn't exist"});

    const compare=await bcrypt.compare(password,user.password);
    if(!compare) return res.status(400).json({message:"invalid credentials"});
    const token=jwt.sign({username:validatename,id:user._id},JWT_SECRET);
    res.status(200).json({message:`${username} logged in successfully`,token})
    // token=
    
} catch (error) {
   return res.status(500).json({message:err})
}
});


app.post('/populatedb',authmiddleware,async (req,res)=>{
try {
    // const {content}=req.body;
    const {motivations}=req.body;
    if(!motivations) return res.status(400).json({message:"Nothing to be added"})
    motivations.forEach(async m=> {
     const existingcontent=await Motive.findOne({content:m.content});
     if(existingcontent)  console.log(`"${existingcontent}" already exists in the db , skipping`);
     else{
        await Motive.create({content:m.content,source:m.source});
        
     }
    })
    return res.status(200).json({message:"DB populated"})
    
} catch (error) {
    return res.status(400).json({message:error})
}
})

app.get("/motivation",authmiddleware,limiter,async (req,res)=>{
// considering whether get motivation should be a post request
const motivations=await Motive.find();
if(!motivations) return res.status(400).json({message:"No motivations"});
console.log(req.ip)
return res.status(200).json({motivations})
})

app.use((req,res)=>{
    return res.status(404).json("Route doesn't exist")
})

//check pimit for documentations