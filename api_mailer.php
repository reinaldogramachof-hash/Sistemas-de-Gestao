<?php

/**
 * Simple Mailer Class for SMTP
 * Implements basic SMTP functionality without external dependencies like PHPMailer.
 */
class SimpleMailer
{
    private $host;
    private $port;
    private $username;
    private $password;
    private $timeout = 30;
    private $debug = false;
    private $logs = [];

    public function __construct($host, $port, $username, $password)
    {
        $this->host = $host;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }

    public function setDebug($debug)
    {
        $this->debug = $debug;
    }

    public function getLogs()
    {
        return $this->logs;
    }

    private function log($message)
    {
        $this->logs[] = date('H:i:s') . " - " . $message;
        if ($this->debug) {
            error_log("SimpleMailer: " . $message);
        }
    }

    public function send($to, $subject, $message, $from_email, $from_name)
    {
        $socket = fsockopen($this->host, $this->port, $errno, $errstr, $this->timeout);
        if (!$socket) {
            $this->log("Error connecting to '$this->host': $errno - $errstr");
            return false;
        }

        $this->read($socket); // Welcome message

        if (!$this->cmd($socket, "EHLO " . gethostname()))
            return false;

        // AUTH
        if (!$this->cmd($socket, "AUTH LOGIN"))
            return false;
        if (!$this->cmd($socket, base64_encode($this->username)))
            return false;
        if (!$this->cmd($socket, base64_encode($this->password)))
            return false;

        // MAIL FROM
        if (!$this->cmd($socket, "MAIL FROM: <$from_email>"))
            return false;

        // RCPT TO
        if (!$this->cmd($socket, "RCPT TO: <$to>"))
            return false;

        // DATA
        if (!$this->cmd($socket, "DATA"))
            return false;

        // Headers
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: $from_name <$from_email>\r\n";
        $headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "Date: " . date("r") . "\r\n";

        $content = $headers . "\r\n" . $message . "\r\n.\r\n";

        fwrite($socket, $content);
        $response = $this->read($socket);

        if (substr($response, 0, 3) != '250') {
            $this->log("Error sending data: $response");
            return false;
        }

        $this->cmd($socket, "QUIT");
        fclose($socket);

        $this->log("Email sent successfully to $to");
        return true;
    }

    private function cmd($socket, $command)
    {
        fwrite($socket, $command . "\r\n");
        $response = $this->read($socket);
        // Check for success codes (2xx or 3xx)
        $code = substr($response, 0, 3);
        if ($code >= 400) {
            $this->log("Error with command '$command': $response");
            return false;
        }
        return true;
    }

    private function read($socket)
    {
        $response = "";
        while ($str = fgets($socket, 515)) {
            $response .= $str;
            if (substr($str, 3, 1) == " ")
                break;
        }
        return $response;
    }
}

/**
 * Helper function used by api_licenca_ml.php
 */
function sendLicenseEmail($to, $product, $key, $link)
{
    global $SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS;

    if (empty($SMTP_HOST) || empty($SMTP_USER)) {
        // Log lack of configuration?
        return false;
    }

    // Default cleanup
    $link = $link ?? '#';
    // Ensure absolute link if needed, but usually relative is fine if handled by client

    $clean_link = $link; // Keep original link 

    $subject = "Sua Licença - $product";

    // HTML Template
    $template = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
        <div style='text-align: center; margin-bottom: 20px;'>
            <h2 style='color: #2c3e50;'>$product</h2>
            <p style='color: #7f8c8d;'>Obrigado por sua compra!</p>
        </div>
        
        <div style='background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;'>
            <p><strong>Sua Chave de Licença:</strong></p>
            <div style='background: #fff; padding: 15px; border: 1px dashed #3498db; text-align: center; font-size: 18px; font-weight: bold; color: #2980b9;'>
                $key
            </div>
        </div>

        <p>Para acessar o sistema, utilize o link abaixo:</p>
        <p style='text-align: center;'>
            <a href='$clean_link' style='display: inline-block; padding: 12px 25px; background: #27ae60; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;'>Acessar Sistema</a>
        </p>

        <p style='font-size: 12px; color: #999; margin-top: 30px; text-align: center;'>
            Se você não realizou esta compra, ignore este e-mail.
        </p>
        
        <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>
        <p style='font-size: 11px; color: #aaa; text-align: center;'>
            Enviado automaticamente pelo Servidor de Licenças.
        </p>
    </div>
    ";

    $mailer = new SimpleMailer($SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS);
    return $mailer->send($to, $subject, $template, $SMTP_USER, "Sistemas de Gestão");
}
