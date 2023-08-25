
//imports
import express from 'express';
import mongoose from 'mongoose';
import clc from 'cli-color';
import bcrypt from 'bcrypt'
import validator from 'validator';
import session from 'express-session';
import MongoDBSession from 'connect-mongodb-session'
// custom imports
import { cleanUpAndValidate } from './Utils/AuthUtils.js';
import userSchema from './userSchema.js';
import TodoModal from './Modals/TodoModal.js';
import { isAuth } from './Middlewares/AuthMiddleware.js';
// import { rateLimiting } from './Middlewares/rateLimiting.js';
// variables
const app = express();
// we are using a port 8001
const PORT = process.env.PORT||8001
const saltRound =10;
const MongoDb = MongoDBSession(session);

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
// mongoDB atlas connection
// connecting url
const MONGO_URL = `mongodb+srv://rubyp20001:12345@cluster0.zjngng9.mongodb.net/TODO_App`

app.set("view engine", "ejs");
// Database connection
mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log(clc.green.bold.underline("MongoDb connected"));
  })
  .catch((err) => {
    console.log(clc.red.bold(err));
  });

  const store = new MongoDb({
    uri: MONGO_URL,
    collection: "sessions",
  });
  
  app.use(
    session({
      secret: "This is Todo app, we dont love coding",
      resave: false,
      saveUninitialized: false,
      store: store,
    })
  );
// MVC Structure
app.get('/' ,(req,res)=>{
    return res.send("this is a to-do app")
})
app.get("/register", (req, res) => {
    return res.render("register");
  });
  app.get("/login", (req, res) => {
    return res.render("login");
  });

  app.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, password, username } = req.body;
  
    //data validation
      try {
         await cleanUpAndValidate({name,email,username,password})
         const userExistEmail = await userSchema.findOne({ email });

    console.log(userExistEmail);
    if (userExistEmail) {
      return res.send({
        status: 400,
        message: "Email Already exits",
      });
    }

    const userExistUsername = await userSchema.findOne({ username });

    if (userExistUsername) {
      return res.send({
        status: 400,
        message: "Username Already exits",
      });
    }
         const hashPassword = await bcrypt.hash(password, saltRound);

         const user = new userSchema({
            name: name,
            email: email,
            password: hashPassword,
            username: username,
          });
      
          try {
            const userDb = await user.save();
            console.log(userDb);
            return res.send({
              status: 201,
              message: "User register successfully",
              data: userDb,
            });
          } catch (error) {
            return res.send({
              status: 500,
              message: "Database error",
              error: error,
            });
           }

      } catch (error) {
        console.log(error)
        return res.send({
            status:400,
            message:'invalid data',
            data:error,
        })

      }
    })

    app.post("/login" ,async (req,res)=>{   
      console.log(req);
      const {loginId ,password} = req.body;
      if (!loginId || !password) {
        return res.send({
          status: 400,
          message: "missing credentials",
        });
      }
    
      if (typeof loginId !== "string" || typeof password !== "string") {
        return res.send({
          status: 400,
          message: "Invalid data format",
        });
      }
      try {
        let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await userSchema.findOne({ email: loginId });
    } else {
      userDb = await userSchema.findOne({ username: loginId });
    }                        

    if (!userDb) {
      return res.send({
        status: 400,
        message: "User not found, Please register first",
      });
    }

    //password compare bcrypt.compare
    const isMatch = await bcrypt.compare(password, userDb.password);

    if (!isMatch) {
      return res.send({
        status: 400,
        message: "Password Does not match",
      });
    }
    console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      username: userDb.username,
      email: userDb.email,
      userId: userDb._id,
    };

    return res.redirect('/dashboard')


      } catch (error) {
        console.log(error);
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
      }
    })
    // here isAuth is a middleware
    app.get("/dashboard", isAuth,async (req, res) => {
      console.log(req.session);
  const username = req.session.user.username;

  try {
    const todos = await TodoModal.find({ username: username });
    console.log(todos);
    return res.render("dashboard",{todos:todos});
    // return res.send({
    //   status: 200,
    //   message:"Read success",
    //   data: todos
    // })
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
    });

    app.post("/logout", isAuth, (req, res) => {
      console.log(req.session);
      req.session.destroy((err) => {
        if (err) throw err;
    
        return res.redirect("/login");
      });
    });
    app.post("/logout_from_all_devices", isAuth, async (req, res) => {
      const username = req.session.user.username;
    
      //create a session schema
      const Schema = mongoose.Schema;
      const sessionSchema = new Schema({ _id: String }, { strict: false });
      const sessionModel = mongoose.model("session", sessionSchema);
    
      try {
        const deletionCount = await sessionModel.deleteMany({
          "session.user.username": username,
        });
        console.log(deletionCount);
        return res.send({
          status: 200,
          message: "Logout from all devices successfully",
        });
      } catch (error) {
        return res.send({
          status: 500,
          message: "Logout Failed",
          error: error,
        });
      }
    });
    app.post("/create-item", isAuth, async (req, res) => {
      console.log(req.body);
    
      const todoText = req.body.todo;
    
      //data validation
      if (!todoText) {
        return res.send({
          status: 400,
          message: "Todo is Empty",
        });
      }
    
      if (typeof todoText !== "string") {
        return res.send({
          status: 400,
          message: "Invalid Todo format",
        });
      }
    
      if (todoText.length > 100) {
        return res.send({
          status: 400,
          message: "Todo is too long, should be less than 100 char.",
        });
      }
    
      //intialize todo schema and store it in Db
      const todo = new TodoModal({
        todo: todoText,
        username: req.session.user.username,
      });
    
      try {
        const todoDb = await todo.save();
    
        console.log(todo);
        return res.send({
          status: 201,
          message: "Todo created successfully",
          data: todoDb,
        });
      } catch (error) {
        return res.send({
          status: 500,
          message: "Database error",
          error: error,
        });
      }
    });
    
    app.post("/edit-item", isAuth, async (req, res) => {
      console.log(req.body);
    
      const { id, newData } = req.body;
    
      //data validation
      if (!id || !newData) {
        return res.send({
          status: 400,
          message: "Missing credentials",
        });
      }
      if (typeof newData !== "string") {
        return res.send({
          status: 400,
          message: "Invalid Todo format",
        });
      }
    
      if (newData.length > 100) {
        return res.send({
          status: 400,
          message: "Todo is too long, should be less than 100 char.",
        });
      }
    
      try {
        const todoDb = await TodoModal.findOneAndUpdate(
          { _id: id },
          { todo: newData }
        );
        console.log(todoDb);
    
        return res.send({
          status: 200,
          message: "Todo updated Successfully",
          data: todoDb,
        });
      } catch (error) {
        return res.send({
          status: 500,
          message: "Database error",
          error: error,
        });
      }
    });
    
    app.post("/delete-item", isAuth, async (req, res) => {
      console.log(req.body);
    
      const id = req.body.id;
    
      //data validation
      if (!id) {
        return res.send({
          status: 400,
          message: "Missing credentials",
        });
      }
    
      try {
        const todoDb = await TodoModal.findOneAndDelete({ _id: id });
        console.log(todoDb);
    
        return res.send({
          status: 200,
          message: "Todo deleted Successfully",
          data: todoDb,
        });
      } catch (error) {
        return res.send({
          status: 500,
          message: "Database error",
          error: error,
        });
      }
    });
    // app.get("/read-item", async (req, res) => {
    //   console.log(req.session.user.username);
    //   const user_name = req.session.user.username;
    //   try {
    //     const todos = await TodoModal.find({ username: user_name });
    
    //     if (todos.length === 0)
    //       return res.send({
    //         status: 400,
    //         message: "Todo is empty, Please create some.",
    //       });
    
    //     return res.send({
    //       status: 200,
    //       message: "Read Success",
    //       data: todos,
    //     });
    //   } catch (error) {
    //     return res.send({
    //       status: 500,
    //       message: "Database error",
    //       error: error,
    //     });
    //   }
    // });
    

    app.get("/pagination_dashboard", isAuth, async (req, res) => {
      const skip = req.query.skip || 0; //client
      const LIMIT = 5; //backend
    
      const user_name = req.session.user.username;
    
      try {
        const todos = await TodoModal.aggregate([
          //match, pagination
          { $match: { username: user_name } },
          {
            $facet: {
              data: [{ $skip: parseInt(skip) }, { $limit: LIMIT }],
            },
          },
        ]);
    
        // console.log(todos[0].data);
        return res.send({
          status: 200,
          message: "Read success",
          data: todos[0].data,
        });
      } catch (error) {
        return res.send({
          status: 500,
          message: "Database error",
          error: error,
        });
      }
    });
    
app.listen(PORT,()=>{
    console.log(clc.yellow.bold(`Server is running`));
    console.log(clc.yellow.bold.underline(`http://localhost:${PORT}`));
})