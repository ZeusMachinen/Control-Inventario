<?php
/**
 * Test Suite — Analitica Helpers (lightweight, no PHPUnit)
 *
 * Uso: php tests/helpers/test_analitica.php
 *
 * Requiere base de datos con datos de prueba.
 * Solo verifica que los helpers no lancen errores y retornen estructura esperada.
 */

$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/test';

// Simular autenticacion basica
define('TEST_UID', 1);

echo "=== Test Suite: Analitica Helpers ===\n\n";

require_once __DIR__ . '/../../api/helpers/Database.php';
require_once __DIR__ . '/../../api/helpers/ComposicionHelper.php';
require_once __DIR__ . '/../../api/helpers/ScorecardHelper.php';
require_once __DIR__ . '/../../api/helpers/EPDHelper.php';
require_once __DIR__ . '/../../api/helpers/DescarteHelper.php';

$passed = 0;
$failed = 0;

function assertTest(string $name, bool $condition): void {
    global $passed, $failed;
    if ($condition) {
        echo "  ✅ $name\n";
        $passed++;
    } else {
        echo "  ❌ $name\n";
        $failed++;
    }
}

// ─── 1. ComposicionHelper ───
echo "\n📊 ComposicionHelper\n";
try {
    $comp = ComposicionHelper::composicion(TEST_UID);
    assertTest('Retorna array con categorias', is_array($comp));
    assertTest('Contiene total', isset($comp['total']));
    assertTest('Categorias es array', is_array($comp['categorias'] ?? null));
} catch (Throwable $e) {
    echo "  ❌ Error: {$e->getMessage()}\n";
    $failed++;
}

// ─── 2. ScorecardHelper — Benchmarks ───
echo "\n📈 ScorecardHelper\n";
try {
    $hato = ScorecardHelper::benchmarksHato(TEST_UID);
    assertTest('Benchmarks retorna array', is_array($hato));
    assertTest('p_hato entre 0 y 1', $hato['p_hato'] >= 0 && $hato['p_hato'] <= 1);
    assertTest('mortalidad_crias entre 0 y 100', $hato['mortalidad_crias'] >= 0 && $hato['mortalidad_crias'] <= 100);
} catch (Throwable $e) {
    echo "  ❌ Error: {$e->getMessage()}\n";
    $failed++;
}

// ─── 3. Bayesian Shrinkage ───
echo "\n🧮 Bayesian Shrinkage\n";
$result = ScorecardHelper::bayesianShrinkage(3, 10, 0.5);
assertTest('Shrinkage con K=3', $result > 0 && $result < 1);
assertTest('Shrinkage sin datos se acerca a p_hato', abs($result - 0.5) < 0.2);

// ─── 4. Recency Weight ───
echo "\n⏱️  Recency Weight\n";
$w0 = ScorecardHelper::recencyWeight(0);
$w12 = ScorecardHelper::recencyWeight(12);
$w24 = ScorecardHelper::recencyWeight(24);
assertTest('Peso a 0 meses = 1.0', abs($w0 - 1.0) < 0.01);
assertTest('Peso a 12 meses = 0.5', abs($w12 - 0.5) < 0.01);
assertTest('Peso a 24 meses < 0.5', $w24 < $w12);

// ─── 5. EPDHelper ───
echo "\n🎯 EPDHelper\n";
$dummyScorecard = ['n_diagnosticados' => 5, 'tasa_vigente' => 0.6, 'peso_nacer_prom' => 35, 'hijos_total' => 10];
$dummyHato = ['p_hato' => 0.5, 'peso_nacer_hato' => 30, 'supervivencia' => 0.95];
$epd = EPDHelper::epdToro($dummyScorecard, $dummyHato);
assertTest('EPD toro retorna indice', isset($epd['indice']));
assertTest('Indice entre 0 y 100', $epd['indice'] >= 0 && $epd['indice'] <= 100);
assertTest('No es provisional con n=5', $epd['provisional'] === false);

// ─── 6. DescarteHelper ───
echo "\n🚨 DescarteHelper\n";
try {
    $descarte = DescarteHelper::listaDescarte(TEST_UID);
    assertTest('Retorna vacas y resumen', isset($descarte['vacas'], $descarte['resumen']));
    assertTest('Resumen suma total', ($descarte['resumen']['bajo_riesgo'] + $descarte['resumen']['atencion'] + $descarte['resumen']['descarte']) === $descarte['resumen']['total_evaluadas']);
} catch (Throwable $e) {
    echo "  ❌ Error: {$e->getMessage()}\n";
    $failed++;
}

echo "\n\n=== Resultado: $passed passed, $failed failed ===\n";
exit($failed > 0 ? 1 : 0);
