const r = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/comprasController');
r.get('/', auth, ctrl.getAll);
r.post('/', auth, ctrl.create);
r.put('/:id', auth, ctrl.update);
r.delete('/:id', auth, ctrl.remove);
module.exports = r;
