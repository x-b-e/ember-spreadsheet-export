import Service from '@ember/service';
import { saveAs } from 'file-saver';
import XLSX from 'xlsx-style';
import optionize from "../utils/utils";

const defaultConfig = {
  sheetName: 'Sheet1',
  fileName: 'export.xlsx',
  multiSheet: false,
};

export default Service.extend({

  export : function(data, options) {

    options = optionize(options, defaultConfig);

    function s2ab(s) {
      let buf = new ArrayBuffer(s.length);
      let view = new Uint8Array(buf);
      for (let i=0; i!==s.length; ++i) { view[i] = s.charCodeAt(i) & 0xFF; }
      return buf;
    }

    function datenum(v, date1904) {
      if(date1904) { v+=1462; }
      let epoch = Date.parse(v);
      return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }

    function sheet_from_array_of_arrays(data) {
      let ws = {};
      let range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
      for(let R = 0; R !== data.length; ++R) {
        for(let C = 0; C !== data[R].length; ++C) {
          if(range.s.r > R) { range.s.r = R; }
          if(range.s.c > C) { range.s.c = C; }
          if(range.e.r < R) { range.e.r = R; }
          if(range.e.c < C) { range.e.c = C; }
          let cell = {v: data[R][C] };
          if(cell.v == null) { continue; }
          let cell_ref = XLSX.utils.encode_cell({c:C,r:R});

          if(typeof cell.v === 'number') { cell.t = 'n'; }
          else if(typeof cell.v === 'boolean') { cell.t = 'b'; }
          else if((typeof cell.v === 'object') && (cell.v._d instanceof Date)) {
            cell.t = 'n'; cell.z = XLSX.SSF._table[14];
            cell.v = datenum(cell.v._d);
          }
          else { cell.t = 's'; }

          ws[cell_ref] = cell;
        }
      }
      if(range.s.c < 10000000) { ws['!ref'] = XLSX.utils.encode_range(range); }
      return ws;
    }

    function Workbook() {
      if(!(this instanceof Workbook)) { return new Workbook(); }
      this.SheetNames = [];
      this.Sheets = {};
    }

    let wb = new Workbook();

    if (options.multiSheet) {
      // Add multiple worksheets to workbook
      data.forEach(sheet => {
        wb.SheetNames.push(sheet.name);
        wb.Sheets[sheet.name] = sheet_from_array_of_arrays(sheet.data);
        if (sheet.merges && sheet.merges.length) {
          wb.Sheets[sheet.name]['!merges'] = sheet.merges;
        }
      });
    } else {
      let sheetName = options.sheetName || 'Sheet 1';
      if (options.isHTMLTable) {
        wb = XLSX.utils.table_to_book(data, {sheet:sheetName, display: options.display});
      } else {
        // Add a single worksheet to workbook
        wb.SheetNames.push(sheetName);
        wb.Sheets[sheetName] = sheet_from_array_of_arrays(data);
        if (options.merges && options.merges.length) {
          wb.Sheets[sheetName]['!merges'] = options.merges;
        }
      }
    }

    

    let wbout = XLSX.write(wb, {bookType:'xlsx', bookSST:true, type: 'binary'});

    let blobToSave = new Blob([s2ab(wbout)],{type:"application/octet-stream"});

    saveAs(blobToSave, options.fileName);

    if (options.returnBlob) {
      return blobToSave;
    }

  }

});
