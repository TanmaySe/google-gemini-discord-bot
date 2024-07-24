const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

router.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'fitbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

router.get('/chat', (req, res) => {
    const userId = req.query.userId; // assuming userId is passed as a query parameter
    const sql = 'SELECT message FROM chats WHERE user_id = ?';
    
    pool.query(sql, [userId], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json(results);
        }
    });
});


router.post('/', (req, res) => {
    const data = req.body; 
    console.log(data)
    
    const sql = 'INSERT INTO chats (user_id, author, message,message_id) VALUES ?';
    const values = data.map(obj => [obj.user_id, obj.author, obj.message,obj.message_id]); 

    pool.query(sql, [values], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ message: 'Internal server error' });
        } else {
            res.status(200).json({ message: 'Successfully inserted into chats table' });
        }
    });
});





module.exports = router;
