'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type StatusState = {
  type: 'idle' | 'success' | 'error';
  message: string;
};

const REQUIRED_HEADERS = [
  'Nombres estudiante',
  'Apellidos estudiante',
  'Primaria/secundaria',
  'Curso (numeral 1 a 6)',
  'Fecha de nacimiento',
];

const EXAMPLE_ROW = ['Nombres', 'Apellidos', 'primaria/secundaria', '1-6', 'AAAA-MM-DD'];

const COLUMN_WIDTHS = [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];

export default function Page() {
  const [status, setStatus] = useState<StatusState>({
    type: 'idle',
    message: 'Aun no se ha enviado ningun archivo.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleDownloadTemplate() {
    const workbook = XLSX.utils.book_new();
    const rows = [REQUIRED_HEADERS, EXAMPLE_ROW];
    const sheet = XLSX.utils.aoa_to_sheet(rows);

    sheet['!cols'] = COLUMN_WIDTHS;
    sheet['!freeze'] = {
      xSplit: 0,
      ySplit: 1,
      topLeftCell: 'A2',
      activePane: 'bottomLeft',
      state: 'frozen',
    };

    REQUIRED_HEADERS.forEach((_, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
      const cell = sheet[cellAddress];
      if (cell) {
        cell.s = {
          font: {
            bold: true,
          },
        };
      }
    });

    EXAMPLE_ROW.forEach((_, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: index });
      const cell = sheet[cellAddress];
      if (cell) {
        cell.s = {
          font: {
            color: { rgb: 'FF0000' },
          },
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, sheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_registro.xlsx');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setStatus({ type: 'idle', message: 'Validando archivo...' });

    try {
      const res = await fetch('/api/registration-sessions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: 'error',
          message:
            data?.error === 'invalid_headers'
              ? `Encabezados invalidos. Revisa: ${data.missingHeaders?.join(', ')}`
              : 'No se pudo validar el archivo.',
        });
        return;
      }

      setStatus({
        type: 'success',
        message: `Archivo recibido. Sesion ${data.id} en estado ${data.status}.`,
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Error de conexion. Intenta nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Validación de Datos Externos (Excel)</h1>
        <p>
          Carga el archivo con encabezados exactos. El sistema rechazará cualquier
          variación para asegurar la calidad de los datos.
        </p>
      </header>

      <section className="section">
        <h2>Subir archivo de estudiantes</h2>
        <p>Completa los datos del docente y adjunta el Excel.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="teacherName">Nombre completo del docente</label>
            <input
              id="teacherName"
              name="teacherName"
              type="text"
              placeholder="Ej. Ana Ruiz"
              required
            />
          </div>

          <div>
            <label htmlFor="teacherEmail">Correo electrónico</label>
            <input
              id="teacherEmail"
              name="teacherEmail"
              type="email"
              placeholder="ana@colegio.edu"
              required
            />
            <div className="helper">Debe ser un correo válido.</div>
          </div>

          <div>
            <label htmlFor="institution">Institución educativa</label>
            <input
              id="institution"
              name="institution"
              type="text"
              placeholder="Nombre de la institución"
              required
            />
            <div className="helper">Si no existe, se creará automáticamente.</div>
          </div>

          <div>
            <label htmlFor="excelFile">Archivo Excel</label>
            <input id="excelFile" name="file" type="file" accept=".xlsx" required />
            <div className="helper">Solo archivos .xlsx</div>
          </div>

          <div className="button-row">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Validando...' : 'Validar archivo'}
            </button>
            <button type="button" className="secondary" onClick={handleDownloadTemplate}>
              Descargar plantilla
            </button>
          </div>
        </form>

        <div
          className={`status ${
            status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : ''
          }`}
        >
          {status.message}
        </div>
      </section>

      <section className="panel-grid">
        <div className="card">
          <h3>Encabezados requeridos</h3>
          <ul>
            <li>Nombres estudiante</li>
            <li>Apellidos estudiante</li>
            <li>Primaria/secundaria</li>
            <li>Curso (numeral 1 a 6)</li>
            <li>Fecha de nacimiento</li>
          </ul>
        </div>
        <div className="card">
          <h3>Resultado esperado</h3>
          <ul>
            <li>Registro de sesión en estado “validating”.</li>
            <li>Log de validación por columna.</li>
            <li>Notificación automática al docente.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Notas rápidas</h3>
          <ul>
            <li>Encabezados deben coincidir exactamente.</li>
            <li>El sistema rechazará archivos incompletos.</li>
            <li>Sube un archivo por sesión de registro.</li>
          </ul>
        </div>
      </section>

      <footer>
        Esta vista es un prototipo inicial para la validación de Excel. La lógica real se
        conecta al backend y registra la sesión de carga.
      </footer>
    </main>
  );
}
