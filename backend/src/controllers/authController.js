import { User } from "../models/User.js";
import { logger } from "../config/logger.js";

/**
 * Signup - Create user profile after Firebase authentication
 */
export const signup = async (req, res) => {
  try {
    const {
      uid,
      email,
      name,
      role = "student",
      department,
      branch,
      university,
      semester,
    } = req.body;

    // Validate required fields
    if (!uid || !email || !name) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Missing required fields: uid, email, name",
      });
    }

    // Check if user already exists by UID first
    let user = await User.findOne({ uid });

    // If the Firebase UID changed or the profile was created before auth was fixed,
    // reconcile by email so the account can still be used.
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.uid = uid;
        user.name = user.name || name;
        user.role = user.role || role;
        user.department = user.department || department || branch || "Computer Science";
        user.university = user.university || university || "";
        if (user.semester == null && Number.isFinite(Number(semester))) {
          user.semester = Number(semester);
        }
        await user.save();

        logger.info(`Linked existing user by email during signup: ${email}`);
        return res.status(200).json({
          code: "USER_LINKED",
          message: "Existing user profile linked successfully",
          data: {
            user: {
              uid: user.uid,
              email: user.email,
              name: user.name,
              role: user.role,
              department: user.department,
              university: user.university,
              semester: user.semester,
              avatar: user.avatar,
              bio: user.bio,
            },
          },
        });
      }
    }

    if (user) {
      // User already exists, just return their profile
      logger.info(`User already exists: ${email}`);
      return res.status(200).json({
        code: "USER_EXISTS",
        message: "User profile already exists",
        data: {
          user: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            university: user.university,
            semester: user.semester,
            avatar: user.avatar,
            bio: user.bio,
          },
        },
      });
    }

    // Create new user
    user = await User.create({
      uid,
      email,
      name,
      role,
      department: department || branch || "Computer Science",
      university: university || "",
      semester: Number.isFinite(Number(semester)) ? Number(semester) : undefined,
      isActive: true,
    });

    logger.info(`User created: ${email} (${uid})`);

    res.status(201).json({
      code: "USER_CREATED",
      message: "User account created successfully",
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          university: user.university,
          semester: user.semester,
          avatar: user.avatar,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    logger.error("Signup error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        code: "DUPLICATE_ENTRY",
        message: `A user with this ${field} already exists`,
      });
    }

    res.status(500).json({
      code: "SIGNUP_ERROR",
      message: "Failed to create user account",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Login - Get user profile after Firebase authentication
 */
export const login = async (req, res) => {
  try {
    const { uid, email, name } = req.body;

    if (!uid) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Missing required field: uid",
      });
    }

    let user = await User.findOne({ uid });

    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.uid = uid;
        if (!user.name && name) {
          user.name = name;
        }
        await user.save();
        logger.info(`Linked existing user by email during login: ${email}`);
      }
    }

    if (!user) {
      const fallbackName =
        name ||
        (email && email.includes("@") ? email.split("@")[0] : "User");

      user = await User.create({
        uid,
        email,
        name: fallbackName,
        role: "student",
        department: "Computer Science",
        university: "",
        semester: undefined,
        isActive: true,
      });

      logger.info(`Created missing user profile during login: ${email || uid}`);
    }

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      code: "LOGIN_SUCCESS",
      message: "Login successful",
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          university: user.university,
          semester: user.semester,
          avatar: user.avatar,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      code: "LOGIN_ERROR",
      message: "Failed to login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Google Auth - Sign up or login with Google
 */
export const googleAuth = async (req, res) => {
  try {
    const { uid, email, name } = req.body;

    if (!uid || !email) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Missing required fields: uid, email",
      });
    }

    // Try to find existing user by UID
    let user = await User.findOne({ uid });

    // If not found by UID, try by email (account linking)
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Update UID to match new Firebase UID
        user.uid = uid;
        await user.save();
        logger.info(`Updated UID for existing user: ${email}`);
      }
    }

    if (user) {
      // User exists, return profile
      logger.info(`Google login - user exists: ${email}`);
      return res.status(200).json({
        code: "LOGIN_SUCCESS",
        message: "Login successful",
        data: {
          user: {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            university: user.university,
            semester: user.semester,
            avatar: user.avatar,
            bio: user.bio,
          },
          isNewUser: false,
        },
      });
    }

    // Create new user if doesn't exist
    user = await User.create({
      uid,
      email,
      name: name || "User",
      role: "student",
      department: "Computer Science",
      university: "",
      semester: undefined,
      isActive: true,
    });

    logger.info(`New user created via Google: ${email}`);

    res.status(201).json({
      code: "USER_CREATED",
      message: "Account created successfully via Google",
      data: {
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          university: user.university,
          semester: user.semester,
          avatar: user.avatar,
          bio: user.bio,
        },
        isNewUser: true,
      },
    });
  } catch (error) {
    logger.error("Google auth error:", error);
    if (error.code === 11000) {
      logger.error("Duplicate key error details:", error.keyPattern);
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        code: "DUPLICATE_ENTRY",
        message: `A user with this ${field} already exists`,
      });
    }

    res.status(500).json({
      code: "AUTH_ERROR",
      message: "Failed to authenticate with Google",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
