const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(path.join(__dirname, '../data/clinic.db'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, queue_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, phone TEXT, age INTEGER, gender TEXT,
    reason TEXT, status TEXT DEFAULT 'Waiting', created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});
const today = () => new Date().toISOString().slice(0,10);
app.get('/api/patients', (req,res) => {
  db.all("SELECT * FROM patients WHERE date(created_at)=date('now','localtime') ORDER BY id", [], (e,rows) => e ? res.status(500).json({error:e.message}) : res.json(rows));
});
app.post('/api/patients', (req,res) => {
  const {name,phone,age,gender,reason} = req.body;
  if (!name || !name.trim()) return res.status(400).json({error:'Patient name is required'});
  db.get("SELECT COUNT(*) AS n FROM patients WHERE date(created_at)=date('now','localtime')", [], (e,row) => {
    if(e) return res.status(500).json({error:e.message});
    const queue_no = `T${String(row.n+1).padStart(3,'0')}`;
    db.run('INSERT INTO patients(queue_no,name,phone,age,gender,reason) VALUES(?,?,?,?,?,?)',
      [queue_no,name.trim(),phone||'',age||null,gender||'',reason||''], function(err) {
        if(err) return res.status(500).json({error:err.message});
        db.get('SELECT * FROM patients WHERE id=?',[this.lastID],(_,patient)=>res.status(201).json(patient));
      });
  });
});
app.patch('/api/patients/:id/status', (req,res) => {
  const allowed = ['Waiting','In Consultation','Completed'];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:'Invalid status'});
  db.run('UPDATE patients SET status=? WHERE id=?',[req.body.status,req.params.id],function(e){
    if(e) return res.status(500).json({error:e.message});
    if(!this.changes) return res.status(404).json({error:'Patient not found'});
    res.json({success:true});
  });
});
app.get('/api/stats', (req,res) => db.get(`SELECT COUNT(*) total,
  SUM(status='Waiting') waiting, SUM(status='In Consultation') consulting,
  SUM(status='Completed') completed FROM patients WHERE date(created_at)=date('now','localtime')`, [], (e,row)=>e?res.status(500).json({error:e.message}):res.json(row)));
app.listen(PORT, () => console.log(`Clinic system running at http://localhost:${PORT}`));
