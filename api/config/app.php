<?php
/**
 * Configuración general de la aplicación
 */

define('JWT_SECRET',       'c4mb14r_3st0_3n_pr0ducc10n_4bc7d8e9f0123456'); // Fijo, NO usar random_bytes()
define('JWT_EXPIRACION',   900);        // 15 minutos en segundos
define('REFRESH_EXPIRACION', 30 * 24 * 3600); // 30 días en segundos
define('UPLOAD_MAX_SIZE',  5 * 1024 * 1024); // 5 MB
define('UPLOAD_PATH',      __DIR__ . '/../uploads/fotos/animales/');
define('UPLOAD_URL',       '/api/uploads/fotos/animales/');
define('ITEMS_POR_PAGINA', 20);
define('TZ',               'America/Bogota');
define('CELO_CICLO_DIAS',  21);     // Ciclo de celo bovino aprox. 21 días
define('GESTACION_DIAS',   283);    // Gestación bovina aprox. 283 días

date_default_timezone_set(TZ);
