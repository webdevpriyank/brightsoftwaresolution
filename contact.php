<?php
/**
 * Bright Software Solution — contact form handler (Hostinger shared hosting)
 *
 * Uses PHP mail(). On Hostinger, FROM_EMAIL must be a real mailbox on your
 * domain (create it in hPanel → Emails) or messages may be rejected/spam-filtered.
 */

// ---------------- Configuration ----------------
const TO_EMAIL   = 'info@brightsoftwaresolution.in';
const FROM_EMAIL = 'no-reply@brightsoftwaresolution.in';   // must exist on your domain
const FROM_NAME  = 'Bright Website';
const MIN_SECONDS_ON_PAGE = 3;      // basic bot protection
const RATE_LIMIT_PER_HOUR = 5;      // per IP
// -----------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(bool $ok, string $error = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'method_not_allowed', 405);
}

// Only accept submissions from our own site
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host   = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '' && $host !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
    respond(false, 'bad_origin', 403);
}

// Honeypot + timing trap
if (!empty($_POST['website'])) respond(true); // silently accept bots
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - $ts) < MIN_SECONDS_ON_PAGE) respond(true);

// Simple per-IP rate limit (file based, no DB needed)
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$dir  = sys_get_temp_dir() . '/bright_rl';
if (!is_dir($dir)) @mkdir($dir, 0700, true);
$file = $dir . '/' . hash('sha256', $ip);
$now  = time();
$hits = [];
if (is_file($file)) {
    $hits = array_filter(array_map('intval', explode(',', (string)@file_get_contents($file))), fn($t) => $t > $now - 3600);
}
if (count($hits) >= RATE_LIMIT_PER_HOUR) respond(false, 'rate_limited', 429);
$hits[] = $now;
@file_put_contents($file, implode(',', $hits), LOCK_EX);

// Collect + sanitise
function clean(string $key, int $max): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
}
$name    = preg_replace('/[\n\t]+/', ' ', clean('name', 100));
$company = preg_replace('/[\n\t]+/', ' ', clean('company', 120));
$email   = clean('email', 150);
$phone   = preg_replace('/[^0-9+\-\s().]/', '', clean('phone', 30));
$message = clean('message', 4000);
$lang    = clean('lang', 2) === 'ar' ? 'Arabic' : 'English';
$page    = preg_replace('/[^\w\-\/]/', '', clean('page', 200));

// Marketing attribution (UTM tags, ad click ids, landing page) — whitelisted keys only
$attrKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'li_fat_id', 'landing_page', 'referrer'];
$attrIn   = is_array($_POST['attr'] ?? null) ? $_POST['attr'] : [];
$attr     = [];
foreach ($attrKeys as $k) {
    if (!empty($attrIn[$k])) $attr[$k] = mb_substr(str_replace(["\r", "\n", "\0"], ' ', trim((string)$attrIn[$k])), 0, 300);
}

$allowed  = ['WhatsApp Platform', 'Software Development', 'ERP', 'Graphic Design', 'Brand Building', 'Digital Marketing', 'Infrastructure'];
$services = array_values(array_intersect((array)($_POST['services'] ?? []), $allowed));

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'invalid', 422);
}

// Build email
$subject = 'New enquiry from ' . $name . ($company ? " ({$company})" : '') . ' — brightsoftwaresolution.in';
$body  = "You have a new enquiry from the website.\n\n";
$body .= "Name:      {$name}\n";
$body .= "Company:   " . ($company ?: '—') . "\n";
$body .= "Email:     {$email}\n";
$body .= "Phone:     " . ($phone ?: '—') . "\n";
$body .= "Interests: " . ($services ? implode(', ', $services) : '—') . "\n";
$body .= "Language:  {$lang}\n";
$body .= "Sent from: " . ($page ?: '/') . "\n";
if ($attr) {
    $body .= "\nSource / campaign:\n";
    foreach ($attr as $k => $v) $body .= str_pad($k . ':', 14) . $v . "\n";
}
$body .= "\nMessage:\n" . str_repeat('-', 40) . "\n{$message}\n" . str_repeat('-', 40) . "\n\n";
$body .= "Sent " . date('d M Y, H:i') . " · IP {$ip}\n";

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$encodedFrom    = '=?UTF-8?B?' . base64_encode(FROM_NAME) . '?=';
$headers  = "From: {$encodedFrom} <" . FROM_EMAIL . ">\r\n";
$headers .= "Reply-To: {$email}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

$sent = @mail(TO_EMAIL, $encodedSubject, $body, $headers, '-f' . FROM_EMAIL);

respond($sent, $sent ? '' : 'mail_failed', $sent ? 200 : 500);
