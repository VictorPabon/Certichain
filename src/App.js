import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import ABI from './CertiChainABI.json'; // Exporta el ABI desde Remix

// Dirección de tu contrato desplegado en Quorum
const CONTRACT_ADDRESS = "0x..."; 

function App() {
  const [account, setAccount] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  
  // Datos para verificación
  const [verifyId, setVerifyId] = useState("");
  const [certData, setCertData] = useState(null);

  // 1. Conectar Wallet (MetaMask configurado a Quorum)
  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    }
  };

  // CASO DE USO 1: EMISIÓN
  const handleMint = async () => {
    setStatus("Subiendo a IPFS...");
    
    // Paso A: Subir PDF al Backend
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post('http://localhost:3001/upload-pdf', formData);
    const ipfsHash = res.data.url; // URI del token

    setStatus("Confirmando en Blockchain...");

    // Paso B: Escribir en Smart Contract
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Llamada a la función mintCertificate del contrato
    const tx = await contract.mintCertificate(account, ipfsHash, "Juan Perez", "Ing. Sistemas");
    await tx.wait();
    
    setStatus(`¡Éxito! Título emitido.`);
  };

  // CASO DE USO 2 Y 3: VERIFICACIÓN Y REVOCACIÓN (Visualización)
  const handleVerify = async () => {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        // Llamada a verifyCertificate
        const data = await contract.verifyCertificate(verifyId);
        
        setCertData({
            name: data[0],
            career: data[1],
            date: new Date(data[2].toNumber() * 1000).toLocaleDateString(),
            isValid: data[3] // Este es el booleano mágico
        });
    } catch (error) {
        alert("Certificado no encontrado");
    }
  };

  const handleRevoke = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      const tx = await contract.revokeCertificate(verifyId);
      await tx.wait();
      alert("Certificado Revocado");
  }

  return (
    <div style={{padding: 20}}>
      <h1>CertiChain Demo</h1>
      {!account && <button onClick={connectWallet}>Conectar Wallet</button>}
      
      {/* VISTA ADMINISTRADOR */}
      <div style={{border: '1px solid gray', padding: 10, margin: 10}}>
        <h2>Emisión (Admin)</h2>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleMint}>Emitir Título</button>
        <p>{status}</p>
      </div>

      {/* VISTA VERIFICADOR / GESTIÓN */}
      <div style={{border: '1px solid blue', padding: 10, margin: 10}}>
        <h2>Verificación y Gestión</h2>
        <input placeholder="ID del Token" onChange={(e) => setVerifyId(e.target.value)} />
        <button onClick={handleVerify}>Verificar</button>
        
        {certData && (
            <div style={{backgroundColor: certData.isValid ? '#d4edda' : '#f8d7da', padding: 10}}>
                <h3>Estado: {certData.isValid ? "✅ VÁLIDO" : "❌ REVOCADO"}</h3>
                <p>Alumno: {certData.name}</p>
                <p>Carrera: {certData.career}</p>
                
                {/* Botón solo visible si eres admin en la demo */}
                {certData.isValid && <button onClick={handleRevoke} style={{background: 'red', color: 'white'}}>REVOCAR (Solo Admin)</button>}
            </div>
        )}
      </div>
    </div>
  );
}

export default App;