<?php
/**
 * Clase Validator — Validación de datos de entrada
 * Uso: Validator::validate($datos, ['campo' => 'requerido|email|min:3|max:255|numerico|entero'])
 */
class Validator
{
    private array $errores = [];

    /**
     * Valida un array de datos contra reglas.
     * Retorna true si pasa, false si hay errores.
     */
    public function validar(array $datos, array $reglas): bool
    {
        $this->errores = [];

        foreach ($reglas as $campo => $reglaStr) {
            $reglasLista = explode('|', $reglaStr);
            $valor = $datos[$campo] ?? null;

            foreach ($reglasLista as $regla) {
                $parametros = [];

                if (str_contains($regla, ':')) {
                    [$regla, $paramStr] = explode(':', $regla, 2);
                    $parametros = explode(',', $paramStr);
                }

                $metodo = 'validar' . ucfirst($regla);
                if (method_exists($this, $metodo)) {
                    $this->$metodo($campo, $valor, $parametros);
                }
            }
        }

        return empty($this->errores);
    }

    /**
     * Retorna los errores de validación.
     */
    public function errores(): array
    {
        return $this->errores;
    }

    /**
     * Retorna true si hay errores.
     */
    public function fallo(): bool
    {
        return !empty($this->errores);
    }

    // --- Reglas de validación ---

    private function agregarError(string $campo, string $mensaje): void
    {
        $this->errores[$campo][] = $mensaje;
    }

    private function validarRequerido(string $campo, mixed $valor): void
    {
        if ($valor === null || $valor === '' || (is_array($valor) && empty($valor))) {
            $this->agregarError($campo, "El campo $campo es obligatorio");
        }
    }

    private function validarEmail(string $campo, mixed $valor): void
    {
        if ($valor !== null && $valor !== '' && !filter_var($valor, FILTER_VALIDATE_EMAIL)) {
            $this->agregarError($campo, "El campo $campo debe ser un email válido");
        }
    }

    private function validarMin(string $campo, mixed $valor, array $params): void
    {
        if ($valor !== null && $valor !== '') {
            $min = (int)($params[0] ?? 0);
            if (is_string($valor) && mb_strlen($valor) < $min) {
                $this->agregarError($campo, "El campo $campo debe tener al menos $min caracteres");
            }
            if (is_numeric($valor) && $valor < $min) {
                $this->agregarError($campo, "El campo $campo debe ser mayor o igual a $min");
            }
        }
    }

    private function validarMax(string $campo, mixed $valor, array $params): void
    {
        if ($valor !== null && $valor !== '') {
            $max = (int)($params[0] ?? 0);
            if (is_string($valor) && mb_strlen($valor) > $max) {
                $this->agregarError($campo, "El campo $campo debe tener máximo $max caracteres");
            }
            if (is_numeric($valor) && $valor > $max) {
                $this->agregarError($campo, "El campo $campo debe ser menor o igual a $max");
            }
        }
    }

    private function validarNumerico(string $campo, mixed $valor): void
    {
        if ($valor !== null && $valor !== '' && !is_numeric($valor)) {
            $this->agregarError($campo, "El campo $campo debe ser numérico");
        }
    }

    private function validarEntero(string $campo, mixed $valor): void
    {
        if ($valor !== null && $valor !== '' && filter_var($valor, FILTER_VALIDATE_INT) === false) {
            $this->agregarError($campo, "El campo $campo debe ser un número entero");
        }
    }

    private function validarFecha(string $campo, mixed $valor): void
    {
        if ($valor !== null && $valor !== '') {
            $d = \DateTime::createFromFormat('Y-m-d', $valor);
            if (!$d || $d->format('Y-m-d') !== $valor) {
                $this->agregarError($campo, "El campo $campo debe ser una fecha válida (YYYY-MM-DD)");
            }
        }
    }

    private function validarEnum(string $campo, mixed $valor, array $params): void
    {
        if ($valor !== null && $valor !== '' && !in_array($valor, $params, true)) {
            $this->agregarError($campo, "El campo $campo debe ser uno de: " . implode(', ', $params));
        }
    }
}
