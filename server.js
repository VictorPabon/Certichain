require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pinataSDK = require('@pinata/sdk');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

// Configura tus llaves de Pinata en un archivo .env
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

// Configuración para recibir archivos temporales
const upload = multer({ dest: 'uploads/' });

app.post('/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        const readableStreamForFile = fs.createReadStream(req.file.path);
        const options = {
            pinataMetadata: {
                name: req.file.originalname,
            }
        };

        // 1. Subir a IPFS
        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        
        // 2. Borrar archivo temporal
        fs.unlinkSync(req.file.path);

        // 3. Devolver el Hash al Frontend
        res.json({ 
            success: true, 
            ipfsHash: result.IpfsHash, 
            url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}` 
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Error subiendo a IPFS" });
    }
});

app.listen(3001, () => {
    console.log('Backend corriendo en puerto 3001');
});