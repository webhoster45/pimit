require('dotenv').config()
const { urlencoded } = require('body-parser');
const express=require('express');
const mongoose=require('mongoose');
const JWT_SECRET=process.env.JWT_SECRET;
const PORT=process.env.PORT||5000;
const Schema=mongoose.Schema;


const app=express();


const userschema=new Schema({
  username:{type:String,required:true,unique:true},
  password:{type:String , required:true}
});

const motiveschema=new Schema({
    content:{type: String, required: true},
    source:{type: String, required:true}
},{timestamps:true})

const Motive=mongoose.model("Motive",motiveschema);
const User=mongoose.model("User",userschema)

app.use(express.json());
app.use(express.urlencoded({extended:true}))

mongoose.connect(process.env.MONGODB_URL)
.then(()=>{console.log("MongoDB connected"),app.listen(PORT,()=>{console.log(`App running on PORT: ${PORT}`)})})
.catch((err)=>console.log(err));

//------------------------------UNTESTED CODE---------------------------------

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
    let ip; 
    if(!username||!password) return res.status(400).json({message:"Invalid credentials"});
    const finduser=await User.findOne({username:validatename});
    if(!finduser) return res.status(400).json({message:"User already exists"})
    const hashedpassword=await bycrpt.hash(password,10);
    const token=jwt.sign({username},JWT_SECRET);
    await User.create({username:username,password:hashedpassword,email})
    return res.status(200).json({message:`User: ${username} created successfully`,token});


} catch (error) {
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

    const compare=await bycrpt.compare(password,user.password);
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
     if(existingcontent)  console.log(`${existingcontent} already exists in the db , skipping`);
     else{
        await Motive.create({content:m.content,source:m.source});
        return res.status(200).json({message:"DB populated"})
     }
    });
    
} catch (error) {
    return res.status(400).json({message:error})
}
})

app.post("/getmotivation",authmiddleware,async (req,res)=>{

})

app.use((req,res)=>{
    res.json(404).json("Route doesn't exist")
})