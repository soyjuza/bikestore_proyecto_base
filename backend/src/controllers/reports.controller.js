const reportsService = require('../services/reports.service');

function filtersFrom(query) {
    return {
        desde: query.desde,
        hasta: query.hasta,
        categoria: query.categoria || 'todas'
    };
}

async function dashboard(req, res, next) {
    try {
        const data = await reportsService.getDashboard(filtersFrom(req.query));
        res.json({ ok: true, data });
    } catch (error) {
        next(error);
    }
}

async function exportExcel(req, res, next) {
    try {
        const filters = filtersFrom(req.query);
        const buffer = await reportsService.buildExcel(filters);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="informe-bikestore-${filters.desde}-a-${filters.hasta}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
}

async function exportPdf(req, res, next) {
    try {
        const filters = filtersFrom(req.query);
        const buffer = await reportsService.buildPdf(filters);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="informe-bikestore-${filters.desde}-a-${filters.hasta}.pdf"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
}

module.exports = { dashboard, exportExcel, exportPdf };
