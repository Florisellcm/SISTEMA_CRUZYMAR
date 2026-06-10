/* ═══════════════════════════════════════
   CRUZYMAR · controllers/authController.js
═══════════════════════════════════════ */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const AuthModel = require('../models/authModel');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = AuthModel.findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    process.env.JWT_SECRET, { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
  });
};
