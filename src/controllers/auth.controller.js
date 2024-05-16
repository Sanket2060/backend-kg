import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async (userId) => {
  //function to generate Tokens
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken; //we can change current database detail by database instance
    await user.save({ validateBeforeSave: false }); //to save the changes on instance and validateBeforeSave tells the code
    //that not to follow validations (required and other requirements of model but just save the changed data)
    console.log(
      "Access and refresh Token at generation function:",
      accessToken,
      refreshToken
    );
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const existedUser = await User.findOne(email);

if (existedUser) {
  throw new ApiError(401, "Username or email has already been taken");
}

const completeRegistration = asyncHandler(async (req, res) => {
  try {
    console.log("On complete registration");
    const { firstName, lastName, email, mobile, password } = req.body;

    if (
      [firstName, lastName, email, mobile, password].some((field) =>
        field?.trim()
      ) === ""
    ) {
      //The some function is used to check if at least one element in the array satisfies the provided condition.
      //here if any of the fields equals '' then it throws error
      throw new ApiError(400, "No fields can't be empty");
    }
    const existedUser = await User.findOne(email);

    if (existedUser) {
      throw new ApiError(401, "Username or email has already been taken");
    }

    try {
      updatedUser = await User.create({
        firstName,
        lastName,
        email,
        mobile,
        password,
      });
      // updatedUser.password=null;
      // updatedUser.refreshToken=null;
    } catch (error) {
      throw new ApiError(500, `Can't create user at database:${error}`);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      updatedUser._id
    );
    console.log("Access token,refresh Token:", accessToken, refreshToken);
    const options = {
      httpOnly: true,
      secure: true,
    };
    let finalUser;
    try {
      finalUser = await User.findOne({
        _id: updatedUser._id,
      }).select("-refreshToken -password");
    } catch (error) {
      console.log("User wasn't found at database.");
    }

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, finalUser, "User  created successfully"));
  } catch (error) {
    console.log(`Error somewhere at complete registration: ${error}`);
    throw new ApiError(
      500,
      `Error somewhere at complete registration: ${error}`
    );
  }
});

const LoginUser = asyncHandler(async (req, res) => {
  //     //get data from req.body (req->body data)
  const { email, password } = req.body;
  console.log("email from login User:", email);
  if (!email) {
    throw new ApiError("Email is required");
  }

  //find user by  email
  const user =
    (await Donor.findOne({
      email,
    })) || (await Distributor.findOne({ email }));

  console.log("user:", user);
  if (!user) {
    throw new ApiError(400, "user with this email doesn't exists");
  }

  //check password
  console.log("Password:", password); //simplestring-nonincrepted
  const isPasswordValid = await user.isPasswordCorrect(password); //????why small user and not Capital->we need the upper instance so,
  if (!isPasswordValid) {
    throw new ApiError(400, "Incorrect password");
  }

  //to send data without password and refreshToken
  let apiResultUser;
  apiResultUser =
    (await Donor.findOne({
      email,
    })
      .select("-password -refreshToken")
      .lean()) ||
    (await Distributor.findOne({
      email,
    })
      .select("-password -refreshToken")
      .lean());

  //Generate  Access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  ); //id from the instance of the trying to  login account
  //access and refreshToken are generated everytime user logs in and refreshToken is deleted from database during logout

  // const loggedInUser=User.findById(user._id).select(  //don't get password and refresh token from database
  //     "-password -refreshToken"
  // ).lean();    //.lean()??? Why to use it here??

  //send cookie
  const options = {
    //only modifyable by server not by browser by anyone
    httpOnly: true,
    secure: true,
  };

  return res //cookieParser middleware added hence res object got cookie property
    .status(200)
    .cookie("accessToken", accessToken, options) //accessToken Cookie
    .cookie("refreshToken", refreshToken, options) //refreshToken Cookie
    .json(
      new ApiResponse(
        200,

        //  user:loggedInUser,accessToken,refreshToken  //????{} missing-> sending multiple at a time???
        apiResultUser,

        "User logged in successfully"
      )
    );
});

const LogoutUser = asyncHandler((req, res) => {
  User.findByIdAndUpdate(     //capital User for database communication and small user as instance to get methods defined under user model
    req.user._id, //user sent by verifyJWT middleware
    {
      $set: {
        refreshToken: undefined, //set refreshToken on database to undefined
      },
    },
    {
      new: true, //when refreshToken is set then when retrieved data from here as const user= then give new data
    }
  )
  //set cookies on browser to undefined
  const options = {
    //only modifyable by server not by browser by anyone
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out sucessfully"));
});

export { completeRegistration, LoginUser, LogoutUser };
