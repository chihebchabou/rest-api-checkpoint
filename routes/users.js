const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const router = express.Router();

const User = require('../models/User');

// @route GET api/users
// @desc Get registered users
// @access Public
router.get('/', async (req, res) => {
  try {
    let users = await User.find({}, { password: 0 });
    if (!users.length) throw new Error('No user has been added yet');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route POST api/users
// @desc Register a user
// @access Public
router.post(
  '/',
  [
    body('firstName', 'Please add a first name').notEmpty(),
    body('lastName', 'Please add a last name').notEmpty(),
    body('email', 'Please enter a valid email').isEmail(),
    body(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { firstName, lastName, email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
      user = new User({ firstName, lastName, email, password });
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(password, salt);
      await user.save();
      res.status(201).json({ success: 'User added successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

// @route PUT api/users/:id
// @desc Update user
// @access Private
router.put(
  '/:id',
  [
    body('email', 'Please enter a valid email').isEmail(),
    body(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const errors = validationResult(req);

    // Check if email exists but not valid
    if (
      email &&
      !errors.isEmpty() &&
      errors.array().some((error) => error.param === 'email')
    ) {
      return res
        .status(400)
        .json(errors.array().filter((error) => error.param === 'email'));
    }

    // Check if password exists but not valid
    if (
      password &&
      !errors.isEmpty() &&
      errors.array().some((error) => error.param === 'password')
    ) {
      return res
        .status(400)
        .json(errors.array().filter((error) => error.param === 'password'));
    }

    // Build user object
    const userObj = {};
    if (firstName) userObj.firstName = firstName;
    if (lastName) userObj.lastName = lastName;
    if (email) userObj.email = email;
    if (password) {
      const salt = await bcrypt.genSalt();
      userObj.password = await bcrypt.hash(password, salt);
    }

    try {
      // Check if the user exists
      let user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ msg: 'User not found' });

      // Find and update user
      user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: userObj },
        { new: true }
      ).select('-password');

      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server Error' });
    }
  }
);

// @route DELETE api/users/:id
// @desc Delete user
// @access Private
router.delete('/:id', async (req, res) => {
  try {
    // Check if the user exists
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Find and remove user
    await User.findByIdAndRemove(req.params.id);
    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
