import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

const DGII_URL =
    'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/placa.aspx';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseHtml(html: string) {
    const $ = cheerio.load(html);
    const table = $('#cphMain_gvDetallesPlaca');

    if (!table.length) {
        return {
            status: 'SIN_RESULTADOS',
            mensaje: $.text().trim(),
        };
    }

    const rows = table.find('tr');
    if (rows.length < 2) {
        throw new Error('Tabla DGII sin datos');
    }

    const headers: string[] = [];
    $(rows[0])
        .find('th, td')
        .each((_, el) => {
            headers.push($(el).text().trim());
        });

    const values: string[] = [];
    $(rows[1])
        .find('td, th')
        .each((_, el) => {
            values.push($(el).text().trim());
        });

    const data: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const value = values[i];
        if (header) {
            data[header] = value;
        }
    }

    return {
        status: 'OK',
        data,
    };
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Allow CORS if it's purely a backend
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    let cedula: string = '';
    let placa: string = '';

    if (req.method === 'POST') {
        cedula = req.body?.cedula as string;
        placa = req.body?.placa as string;
    } else {
        cedula = req.query.cedula as string;
        placa = req.query.placa as string;
    }

    if (!cedula || !placa) {
        return res.status(400).json({ error: 'Parámetros cedula y placa son requeridos' });
    }

    try {
        const commonHeaders = {
            'User-Agent':
                'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9',
        };

        // 1. Get tokens
        const res1 = await fetch(DGII_URL, {
            method: 'GET',
            headers: commonHeaders,
            cache: 'no-store',
        });

        if (!res1.ok) {
            throw new Error('No se pudo cargar página DGII');
        }

        const html1 = await res1.text();
        const cookies = res1.headers.get('set-cookie') || '';

        // Parse cookie to send back
        const cookieString = cookies.split(',').map(c => c.split(';')[0]).join('; ');

        const $1 = cheerio.load(html1);
        const __VIEWSTATE = $1('#__VIEWSTATE').val() as string;
        const __VIEWSTATEGENERATOR = $1('#__VIEWSTATEGENERATOR').val() as string;
        const __EVENTVALIDATION = $1('#__EVENTVALIDATION').val() as string;

        if (!__VIEWSTATE) {
            throw new Error('No encontrado token __VIEWSTATE');
        }

        await delay(1200);

        // 2. Prepare payload
        const payload = new URLSearchParams();
        payload.append('ctl00$smMain', 'ctl00$upMainMaster|ctl00$cphMain$btnConsultar');
        payload.append('ctl00$cphMain$txtRNC', cedula);
        payload.append('ctl00$cphMain$txtPlaca', placa);
        payload.append('__EVENTTARGET', '');
        payload.append('__EVENTARGUMENT', '');
        payload.append('__VIEWSTATE', __VIEWSTATE);

        if (__VIEWSTATEGENERATOR) {
            payload.append('__VIEWSTATEGENERATOR', __VIEWSTATEGENERATOR);
        }
        if (__EVENTVALIDATION) {
            payload.append('__EVENTVALIDATION', __EVENTVALIDATION);
        }

        payload.append('__ASYNCPOST', 'true');
        payload.append('ctl00$cphMain$btnConsultar', 'Consultar');

        const ajaxHeaders = {
            ...commonHeaders,
            Accept: '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'X-MicrosoftAjax': 'Delta=true',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Origin: 'https://dgii.gov.do',
            Referer: DGII_URL,
            Cookie: cookieString,
        };

        // 3. Post to DGII
        const res2 = await fetch(DGII_URL, {
            method: 'POST',
            headers: ajaxHeaders,
            body: payload.toString(),
            cache: 'no-store',
        });

        if (!res2.ok) {
            throw new Error('POST DGII falló');
        }

        const text2 = await res2.text();

        // 4. Extract update panel
        const match = text2.match(/updatePanel\|.*?\|(.*)/s);

        if (!match) {
            throw new Error('DGII cambió formato AJAX o no devolvió resultados esperados');
        }

        const htmlDelta = match[1];

        // 5. Build JSON
        const parsed = await parseHtml(htmlDelta);

        if (parsed.status === 'OK' && parsed.data) {
            // Ensure exactly the structure asked by user
            const rawData = parsed.data;
            const formattedData = {
                Placa: rawData['Placa'] || '',
                Marca: rawData['Marca'] || '',
                Modelo: rawData['Modelo'] || '',
                Color: rawData['Color'] || '',
                Año: rawData['Año'] || rawData['Año de Fabricacion'] || '',
                Estado: rawData['Estado'] || ''
            };
            return res.status(200).json({ status: 'OK', data: formattedData });
        }

        return res.status(200).json(parsed);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Error en la consulta' });
    }
}
