<?php
// API VENDAS - Gestão de Cupons e Afiliados
// V2.0 - Secure ENV
require_once __DIR__ . '/env_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

$ALLOWED_ORIGIN = env('ALLOWED_ORIGIN', '*');
header("Access-Control-Allow-Origin: $ALLOWED_ORIGIN");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// CONFIG
$ADMIN_SECRET = env('ADMIN_SECRET');
$fileCoupons = __DIR__ . '/api_data/sales_coupons.json';
$fileSales = __DIR__ . '/api_data/sales_transactions.json';

// HELPERS
function getDB($file)
{
    if (!file_exists($file))
        return [];
    return json_decode(file_get_contents($file), true) ?? [];
}

function saveDB($file, $data)
{
    if (!is_dir(dirname($file)))
        mkdir(dirname($file), 0755, true);
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function isValidSecret($data, $adminSecret)
{
    if (!isset($data['secret']))
        return false;
    $token = hash('sha256', $adminSecret . date('Y-m-d'));
    return ($data['secret'] === $adminSecret || $data['secret'] === $token);
}

$action = $_GET['action'] ?? '';
$jsonData = json_decode(file_get_contents("php://input"), true) ?? [];

if (empty($action) && isset($jsonData['action']))
    $action = $jsonData['action'];

// --- ROTAS PÚBLICAS (CHECKOUT) ---

if ($action === 'validate_coupon') {
    $code = strtoupper(trim($jsonData['code'] ?? ''));
    if (empty($code)) {
        echo json_encode(['valid' => false, 'message' => 'Código vazio']);
        exit;
    }

    $coupons = getDB($fileCoupons);
    if (isset($coupons[$code])) {
        $coupon = $coupons[$code];
        if ($coupon['active']) {
            echo json_encode([
                'valid' => true,
                'discount_percent' => $coupon['discount'],
                'partner' => $coupon['partner_name']
            ]);
        } else {
            echo json_encode(['valid' => false, 'message' => 'Cupom inativo']);
        }
    } else {
        echo json_encode(['valid' => false, 'message' => 'Cupom não encontrado']);
    }
    exit;
}

if ($action === 'register_sale') {
    // Registra venda vinda do Checkout (depois que o pagamento foi confirmado, ou pré-registro)
    // Na prática real, seria via Webhook. Aqui vamos simular o registro para o Dash do Afiliado.

    $saleData = [
        'id' => uniqid('sale_'),
        'date' => date('Y-m-d H:i:s'),
        'product' => $jsonData['product'] ?? 'N/A',
        'amount' => $jsonData['amount'] ?? 0,
        'coupon_used' => $jsonData['coupon'] ?? null,
        'partner_commission' => 0,
        'status' => 'pending' // pending, approved
    ];

    if ($saleData['coupon_used']) {
        $coupons = getDB($fileCoupons);
        if (isset($coupons[$saleData['coupon_used']])) {
            $partner = $coupons[$saleData['coupon_used']];
            // Lógica de comissão: Ex: 20% do valor
            $saleData['partner_commission'] = $saleData['amount'] * 0.20;
            $saleData['partner_id'] = $partner['partner_id'];
        }
    }

    $sales = getDB($fileSales);
    $sales[] = $saleData;
    saveDB($fileSales, $sales);

    echo json_encode(['status' => 'success', 'sale_id' => $saleData['id']]);
    exit;
}

// --- ROTAS ADMIN (PAINEL DE VENDAS) ---

if ($action === 'list_coupons') {
    if (!isValidSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    echo json_encode(getDB($fileCoupons));
    exit;
}

if ($action === 'save_coupon') {
    if (!isValidSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }

    $code = strtoupper(trim($jsonData['code']));
    $coupons = getDB($fileCoupons);

    $coupons[$code] = [
        'code' => $code,
        'discount' => (int) $jsonData['discount'], // em %
        'partner_name' => $jsonData['partner_name'],
        'partner_id' => $jsonData['partner_id'] ?? uniqid('partner_'),
        'active' => true,
        'created_at' => date('Y-m-d H:i:s')
    ];

    saveDB($fileCoupons, $coupons);
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'dashboard_stats') {
    if (!isValidSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }

    $sales = getDB($fileSales);
    $totalSales = 0;
    $totalCommission = 0;
    $salesCount = count($sales);

    foreach ($sales as $s) {
        if (($s['status'] ?? '') === 'approved') {
            $totalSales += $s['amount'];
            $totalCommission += $s['partner_commission'];
        }
    }

    echo json_encode([
        'total_revenue' => $totalSales,
        'total_commission' => $totalCommission,
        'sales_count' => $salesCount,
        'recent_sales' => array_slice(array_reverse($sales), 0, 20) // Retorna últimas 20 vendas
    ]);
    exit;
}

// --- MERCADO PAGO INTEGRATION ---

$MP_ACCESS_TOKEN = env('MP_ACCESS_TOKEN');
$NOTIFICATION_URL = env('MP_NOTIFICATION_URL', 'https://sistemasdegestao.tech/api_vendas.php?action=webhook');

function mpPost($url, $data)
{
    global $MP_ACCESS_TOKEN;
    $ch = curl_init('https://api.mercadopago.com' . $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $MP_ACCESS_TOKEN
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}

if ($action === 'create_preference') {
    $product = $jsonData['product']; // 'motorista' or 'motoboy'
    $price = (float) $jsonData['price'];
    $couponCode = $jsonData['coupon_code'] ?? '';

    $validPlans = ['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'premium_monthly'];
    $reqPlanCode = $jsonData['plan_code'] ?? 'direct_lifetime';
    if (!in_array($reqPlanCode, $validPlans)) {
        $reqPlanCode = 'direct_lifetime';
    }

    $title = "Licença Vitalícia - Gestão " . ucfirst($product);
    if ($reqPlanCode === 'premium_monthly') {
        $title = "Assinatura Premium Online - Gestão " . ucfirst($product);
    } elseif ($reqPlanCode === 'pro_lifetime') {
        $title = "Licença Pro Vitalícia - Gestão " . ucfirst($product);
    }

    // Metadata para rastreio no Webhook
    $externalRef = json_encode([
        'product' => $product,
        'coupon' => $couponCode,
        'app_generated_id' => uniqid('order_'),
        'plan_code' => $reqPlanCode
    ]);

    $preferenceData = [
        "items" => [
            [
                "title" => $title,
                "quantity" => 1,
                "currency_id" => "BRL",
                "unit_price" => $price
            ]
        ],
        "back_urls" => [
            "success" => "https://sistemasdegestao.tech/loja/success.html",
            "failure" => "https://sistemasdegestao.tech/loja/checkout.html",
            "pending" => "https://sistemasdegestao.tech/loja/checkout.html"
        ],
        "auto_return" => "approved",
        "external_reference" => $externalRef,
        "notification_url" => $NOTIFICATION_URL
    ];

    $preference = mpPost('/checkout/preferences', $preferenceData);

    if (isset($preference['init_point'])) {
        echo json_encode(['status' => 'success', 'init_point' => $preference['init_point'], 'sandbox_init_point' => $preference['sandbox_init_point']]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erro ao criar preferência MP', 'debug' => $preference]);
    }
    exit;
}

if ($action === 'webhook') {
    // MP envia notificações aqui
    $type = $_GET['type'] ?? ''; // payment
    $dataID = $_GET['data_id'] ?? ($_GET['id'] ?? '');

    if ($type === 'payment' || isset($_GET['data_id'])) {
        $payment = mpPost('/v1/payments/' . $dataID, []);

        if (isset($payment['status']) && $payment['status'] === 'approved') {

            // 1. Extrair Metadata (Cupom, Produto)
            $metadata = json_decode($payment['external_reference'], true) ?? [];
            $product = $metadata['product'] ?? 'unknown';
            $coupon = $metadata['coupon'] ?? '';

            $canonicalPlans = [
                'ml_lifetime' => ['name' => 'ML Vitalício', 'billing' => 'one_time', 'channel' => 'mercado_livre', 'version' => 'standalone_ml'],
                'direct_lifetime' => ['name' => 'Direto Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_direct'],
                'pro_lifetime' => ['name' => 'Pro Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_pro'],
                'premium_monthly' => ['name' => 'Premium Online Mensal', 'billing' => 'recurring', 'channel' => 'premium_online', 'version' => 'premium_online']
            ];

            $planCode = $metadata['plan_code'] ?? 'direct_lifetime';
            if (!isset($canonicalPlans[$planCode])) {
                $planCode = 'direct_lifetime';
            }
            $planMeta = $canonicalPlans[$planCode];

            $planName = $planMeta['name'];
            $billingModel = $planMeta['billing'];
            $salesChannel = $planMeta['channel'];
            $systemVersion = $planMeta['version'];

            // 2. Gerar Licença
            require_once __DIR__ . '/api_licenca_ml.php'; // Reutiliza funções de licença

            // Carrega DB
            $dbLicenses = json_decode(file_get_contents($fileLicenses), true);

            // Gera Chave
            $newLicenseKey = strtoupper(uniqid('APP-') . '-' . dechex(time()));
            $clientEmail = $payment['payer']['email'];

            $dbLicenses[$newLicenseKey] = [
                "client" => $clientEmail,
                "email_activation" => $clientEmail,
                "whatsapp" => "via_mercadopago",
                "start_date" => date('Y-m-d'),
                "status" => "active",
                "device_id" => null, // Será vinculado no primeiro login
                "product_type" => $product,
                "payment_id" => $dataID,
                "type" => "venda_direta",
                "plan_code" => $planCode,
                "plan_name" => $planName,
                "billing_model" => $billingModel,
                "sales_channel" => $salesChannel,
                "system_version" => $systemVersion,
                "package_version" => $systemVersion
            ];

            file_put_contents($fileLicenses, json_encode($dbLicenses, JSON_PRETTY_PRINT));

            // 3. Registrar Venda (Comissões)
            $saleData = [
                'id' => $dataID,
                'date' => date('Y-m-d H:i:s'),
                'product' => $product,
                'amount' => $payment['transaction_amount'],
                'net_amount' => $payment['transaction_details']['net_received_amount'],
                'status' => 'approved',
                'coupon_used' => $coupon,
                'client_email' => $clientEmail,
                'license_key' => $newLicenseKey
            ];

            if (!empty($coupon)) {
                $coupons = getDB($fileCoupons);
                if (isset($coupons[$coupon])) {
                    $partner = $coupons[$coupon];
                    // Comissão ex: 20%
                    $saleData['partner_commission'] = $saleData['amount'] * 0.20;
                    $saleData['partner_id'] = $partner['partner_id'];
                }
            }

            $sales = getDB($fileSales);
            $sales[] = $saleData;
            saveDB($fileSales, $sales);

            // TODO: Enviar Email com a Chave (mail() function)
        }
    }
    http_response_code(200); // MP exige 200 OK
    exit;
}
