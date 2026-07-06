const m = require('../models/calidadlotesModel');

exports.getLotes   = async (req, res) => { try { res.json(await m.getLotes(req.query)); } catch(e){ res.status(500).json({error:e.message}); }};
exports.getKpis    = async (req, res) => { try { res.json(await m.getKpis()); } catch(e){ res.status(500).json({error:e.message}); }};
exports.inspeccionar = async (req, res) => {
  try {
    if (!req.body.lote_id) return res.status(400).json({ error: 'lote_id es obligatorio' });
    if (!req.body.estado)  return res.status(400).json({ error: 'estado es obligatorio' });
    if (req.body.estado === 'Rechazado' && !req.body.motivo_rechazo)
      return res.status(400).json({ error: 'Debe indicar el motivo de rechazo' });
    const r = await m.inspeccionar({ ...req.body, inspector_id: req.user?.id });
    res.status(201).json(r);
  } catch(e){ res.status(500).json({error:e.message}); }
};