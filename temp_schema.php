<?php
require 'api/config/database.php';
require 'api/helpers/Database.php';
try {
    $db = Database::conectar();
    $r = $db->query('DESCRIBE rebanos');
    echo "=== rebanos ===\n";
    foreach ($r as $row) { echo $row['Field'] . ' | ' . $row['Type'] . ' | default=' . ($row['Default'] ?? 'NULL') . "\n"; }
    echo "\n=== gastos ===\n";
    $r = $db->query('DESCRIBE gastos');
    foreach ($r as $row) { echo $row['Field'] . ' | ' . $row['Type'] . ' | default=' . ($row['Default'] ?? 'NULL') . "\n"; }
} catch (Exception $e) { echo 'Error: ' . $e->getMessage(); }
