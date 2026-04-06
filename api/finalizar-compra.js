const axios = require('axios');

module.exports = async (req, res) => {
    // Permite que seu site no GitHub Pages acesse esta função
    res.setHeader('Access-Control-Allow-Origin', 'https://silvacomunicacaoaudiovisual.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { nome, telefone, valor, numeros } = req.body;

        // --- CÁLCULO DE EXPIRAÇÃO (10 MINUTOS) ---
        const agora = new Date();
        const dezMinutosDepois = new Date(agora.getTime() + 10 * 60000);
        const dataVencimento = dezMinutosDepois.toISOString().split('T')[0]; 
        // -----------------------------------------

        // 1. GERA O PIX NO ASAAS
        const asaasResponse = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000169684027', 
            billingType: 'PIX',
            value: valor,
            dueDate: dataVencimento, // Data de hoje formatada
            description: `Rifa Digital - ${nome}`,
            externalReference: telefone,
            // Define que o QR Code deixará de funcionar em 10 minutos
            expiryCustomExpirationDate: dezMinutosDepois.toISOString() 
        }, {
            headers: { 'access_token': process.env.ASAAS_API_KEY } 
        });

        const paymentData = asaasResponse.data;

        // 2. SALVA NO SEU FIREBASE
        await axios.put(`https://rifadigital-1da5b-default-rtdb.firebaseio.com/vendas/${paymentData.id}.json`, {
            nome,
            telefone,
            numeros,
            valor,
            status: 'PENDENTE',
            pix_id: paymentData.id,
            pix_url: paymentData.invoiceUrl,
            expira_em: dezMinutosDepois.toISOString(),
            data: agora.toISOString()
        });

        return res.status(200).json({ url: paymentData.invoiceUrl });

    } catch (error) {
        console.error('Erro detalhado:', error.response?.data || error.message);
        return res.status(500).json({ erro: 'Falha ao processar rifa' });
    }
};
