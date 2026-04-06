const axios = require('axios');

module.exports = async (req, res) => {
    // Permite que seu site no GitHub Pages acesse esta função
    res.setHeader('Access-Control-Allow-Origin', 'https://silvacomunicacaoaudiovisual.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { nome, telefone, valor, numeros } = req.body;

        // 1. GERA O PIX NO ASAAS
        const asaasResponse = await axios.post('https://www.asaas.com/api/v3/payments', {
            customer: 'cus_000169684027', // Seu ID de cliente que funcionou
            billingType: 'PIX',
            value: valor,
            dueDate: '2026-12-31', // Data limite para pagar
            description: `Rifa Digital - ${nome}`,
            externalReference: telefone
        }, {
            headers: { 'access_token': process.env.ASAAS_API_KEY } // Pega a chave segura da Vercel
        });

        const paymentData = asaasResponse.data;

        // 2. SALVA NO SEU FIREBASE (rifadigital-1da5b)
        // Isso tira o seu banco do estado "null"
        await axios.put(`https://rifadigital-1da5b-default-rtdb.firebaseio.com/vendas/${paymentData.id}.json`, {
            nome,
            telefone,
            numeros,
            valor,
            status: 'PENDENTE',
            pix_url: paymentData.invoiceUrl,
            data: new Date().toISOString()
        });

        // Retorna o link para o seu index.html abrir
        return res.status(200).json({ url: paymentData.invoiceUrl });

    } catch (error) {
        console.error('Erro detalhado:', error.response?.data || error.message);
        return res.status(500).json({ erro: 'Falha ao processar rifa' });
    }
};