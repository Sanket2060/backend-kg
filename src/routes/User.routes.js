import { Router } from "express";
import { completeRegistration,LoginUser,LogoutUser } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

  const router=Router();
  

  router.route('/register').post(completeRegistration);
  router.route('/login').post(LoginUser);
  
  
  
  //   //secured routes Why secured??
  //   router.route('/logout').post(verifyJWT,LogoutUser);
  router.route('/logout').post(verifyJWT,LogoutUser);
  



  export default router
  