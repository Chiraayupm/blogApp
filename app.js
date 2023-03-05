const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const mongoDbSession = require('connect-mongodb-session')(session);
const day = require(__dirname + '/date.js');

const saltRounds = 10;
const myPlaintextPassword = 'not_bacon';

mongoose.set("strictQuery", false);
mongoose.connect('mongodb://127.0.0.1:27017/blogDB');

const store = new mongoDbSession({
    uri : 'mongodb://127.0.0.1:27017/blogDB',
    collection : 'mySessions'
})


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret : "cookie",
    resave:false,
    saveUninitialized:true,
    store:store
}))


// POST SCHEMA

const postsSchema = mongoose.Schema({
    title : String,
    text : String,
    date: String,
    email : String,
})

  
const Post = mongoose.model('Post',postsSchema);
  
const post = new Post({
    title : "Day 0",
    text : "hello World",
    date : day.getDay(),
    email : "chi@1.com"
})

// post.save();

// USER SCHEMA

const userSchema = mongoose.Schema({
    email : String,
    password : String,
    posts : [postsSchema]
})
  
const User = mongoose.model('User',userSchema);
  
const user = new User({
    email : "chi@1.com",
    password : "1234",
    posts : [post]
})

// user.save();

const isAuth = (req,res,next) => {
    if(req.session.isAuth){
        
        console.log("YES2")
        next()
    }
    else{
        console.log("NO2")
        res.redirect('/login');
    }
}

// ROUTES

app.route('/')
    .get(isAuth ,async (req,res) => {
        const posts = await Post.find({});
        // console.log(users);
        res.render('home' , {time : day.getDay(), posts : posts, id : req.session.userId});
    })

app.route('/login')
    .get((req,res) => {
        res.render('login');
    })
    .post(async (req,res) => {
        const email = req.body.email;
        // console.log(email)
        const foundUser = await User.findOne({email : email})
        if(foundUser){
            bcrypt.compare(req.body.password, foundUser.password,async function(err, result) {
                if(result == true){
                    req.session.isAuth = true;
                    req.session.userId = foundUser._id;
                    // await req.session.save();
                    console.log("YES");
                    res.redirect('/');
                }
                else{ 
                    console.log("NOT");
                    res.redirect('/login');
                }
            });
        }
        else{
            res.redirect('/login');
        }
        
    })

app.route('/register')
    .get((req,res) => {
        res.render('register');
    })
    .post((req,res) => {
        const email = req.body.email;
        console.log(email)
        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
            const user = new User({
                email : email,
                password : hash
            })
            user.save();
            res.redirect('/login');
        });
    })


app.route('/compose')
    .get(isAuth,(req,res) => {
        res.render('compose', {id : req.session._id})
    })    
    .post(isAuth,async (req,res)=>{
        const title = req.body.title;
        const text = req.body.blog;
        const date = day.getDay();
        const id = req.session.userId;

        const user = await User.findById({_id : id});

        console.log(user);

        const post = new Post({
            title:title,
            text: text,
            date : date,
            email : user.email
        })

        post.save();
        user.posts.push(post);
        user.save();

        res.redirect('/');
        
    })

app.get('/profile',async (req,res) =>  {
    const id = req.session.userId;
    const user = await User.findById({_id : id});

    res.render('profile', {posts : user.posts});
})


// LOGOUT

app.get('/logout', (req,res)=>{
    req.session.destroy((err)=>{
        if(!err){
            res.redirect('/login');
        }
    })
})
    
// LISTEN

app.listen(3000,function(){
    console.log("Server Running!");
})



