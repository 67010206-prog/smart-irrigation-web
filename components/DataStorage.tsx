
import { useMemo, useState } from 'react';
import {
  Database,
  Download,
  Search,
  CalendarDays,
  Droplets,
  Thermometer,
  Wind,
  Clock3,
  RefreshCw
} from 'lucide-react';

import type { PumpLog, SensorPoint } from '../lib/types/iot';

interface DataStorageProps {
  history?: SensorPoint[];
  pumpLogs?: PumpLog[];
}

export default function DataStorage({ history = [], pumpLogs = [] }: DataStorageProps) {
  const [dataType, setDataType] = useState('sensors');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // แปลงวันที่เป็น YYYY-MM-DD ตามเวลาท้องถิ่น
  const getDateKey = (value: Date | string | number | null | undefined) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // กรองข้อมูลเซนเซอร์
  const filteredSensors = useMemo(() => {
    return history.filter((item) => {
      const matchesDate = !selectedDate
        || (item.timestamp && getDateKey(item.timestamp) === selectedDate);

      const text = [
        item.time,
        item.temperature,
        item.humidity,
        item.etoMmPerDay
      ].join(' ').toLowerCase();

      return matchesDate && text.includes(search.toLowerCase());
    });
  }, [history, selectedDate, search]);

  // กรองประวัติปั๊มน้ำ
  const filteredPumps = useMemo(() => {
    return pumpLogs.filter((log) => {
      const matchesDate = !selectedDate
        || getDateKey(log.startedAt) === selectedDate;

      const text = [
        log.status,
        log.startedAt,
        log.stoppedAt,
        log.durationSeconds
      ].join(' ').toLowerCase();

      return matchesDate && text.includes(search.toLowerCase());
    });
  }, [pumpLogs, selectedDate, search]);

  // ส่งออกข้อมูลเป็น CSV
  const exportCSV = () => {
    let headers;
    let rows;
    let filename;

    if (dataType === 'sensors') {
      // >> ถ้าเพิ่มค่าที่วัดได้ใหม่ ให้เพิ่มหัวคอลัมน์ CSV ที่นี่
      headers = [
        'Time',
        'Temperature (C)',
        'Humidity (%)',
        'ETo (mm/day)'
      ];

      rows = filteredSensors.map((item) => [
        new Date(item.timestamp).toLocaleString('th-TH'),
        item.temperature,
        item.humidity,
        item.etoMmPerDay
      ]);

      filename = 'AgriFlow_Sensor_Data.csv';
    } else {
      headers = [
        'Start Time',
        'Stop Time',
        'Status',
        'Duration (seconds)'
      ];

      rows = filteredPumps.map((log) => [
        new Date(log.startedAt).toLocaleString('th-TH'),
        log.stoppedAt
          ? new Date(log.stoppedAt).toLocaleString('th-TH')
          : 'กำลังทำงาน',
        log.stoppedAt ? 'OFF' : 'ON',
        log.durationSeconds ?? ''
      ]);

      filename = 'AgriFlow_Pump_History.csv';
    }

    if (rows.length === 0) {
      window.alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = '\uFEFF' + [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const currentCount = dataType === 'sensors'
    ? filteredSensors.length
    : filteredPumps.length;

  return (
    <div className="page-content control-page">

      {/* ส่วนหัว */}
      <div className="page-heading-row">
        <div>
          <div className="eyebrow">DATA MANAGEMENT / STORAGE</div>
          <h1>คลังข้อมูลระบบ</h1>
          <p>จัดเก็บ ตรวจสอบ และเรียกดูข้อมูลย้อนหลังของ AgriFlow</p>
        </div>
      </div>

      {/* ภาพรวมจำนวนข้อมูล */}
      <div className="metrics-grid">

        <div className="panel info-panel">
          <div className="small-panel-heading">
            <div className="small-panel-icon green">
              <Database size={19} />
            </div>
            <div>
              <h3>ข้อมูลเซนเซอร์</h3>
              <span>Sensor Records</span>
            </div>
          </div>
          <h2>{history.length} รายการ</h2>
        </div>

        <div className="panel info-panel">
          <div className="small-panel-heading">
            <div className="small-panel-icon blue">
              <Droplets size={19} />
            </div>
            <div>
              <h3>ประวัติปั๊มน้ำ</h3>
              <span>Pump Records</span>
            </div>
          </div>
          <h2>{pumpLogs.length} รายการ</h2>
        </div>

      </div>

      {/* เครื่องมือจัดการข้อมูล */}
      <section className="panel info-panel">

        <div className="small-panel-heading">
          <div className="small-panel-icon green">
            <Search size={18} />
          </div>
          <div>
            <h3>ค้นหาและจัดการข้อมูล</h3>
            <span>Search & Filter Records</span>
          </div>
        </div>

        <div className="storage-toolbar">

          <div className="storage-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="ค้นหาข้อมูล..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="storage-date">
            <CalendarDays size={17} />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <button
            className="outline-button"
            onClick={() => {
              setSearch('');
              setSelectedDate('');
            }}
          >
            <RefreshCw size={15} />
            ล้างตัวกรอง
          </button>

        </div>

      </section>

      {/* เลือกประเภทข้อมูล */}
      <section className="panel info-panel">

        <div className="storage-tabs">

          <button
            className={dataType === 'sensors' ? 'active' : ''}
            onClick={() => setDataType('sensors')}
          >
            <Database size={17} />
            ข้อมูลเซนเซอร์
          </button>

          <button
            className={dataType === 'pumps' ? 'active' : ''}
            onClick={() => setDataType('pumps')}
          >
            <Droplets size={17} />
            ประวัติปั๊มน้ำ
          </button>

        </div>

        <div className="storage-table-heading">
          <div>
            <h3>
              {dataType === 'sensors'
                ? 'Sensor Data Records'
                : 'Pump Operation Records'}
            </h3>
            <span>พบข้อมูล {currentCount} รายการ</span>
          </div>

          <button
            className="outline-button"
            onClick={exportCSV}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* ตารางข้อมูลเซนเซอร์ */}
        {dataType === 'sensors' ? (

          <div className="storage-table-wrap">
            <table className="storage-table">
              {/*
                ตารางข้อมูลเซนเซอร์
                >> ถ้าเพิ่มค่าที่วัดได้ใหม่ ให้เพิ่ม <th> ที่นี่
                >> และเพิ่ม <td> ในแถวข้อมูลด้านล่าง (colSpan ของแถวว่างก็ปรับด้วย)
              */}
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th><Thermometer size={14} /> อุณหภูมิ</th>
                  <th><Droplets size={14} /> ความชื้นอากาศ</th>
                  <th><Wind size={14} /> ETo</th>
                </tr>
              </thead>

              <tbody>
                {filteredSensors.length > 0 ? (
                  [...filteredSensors].reverse().map((item, index) => (
                    <tr key={`${item.timestamp.getTime()}-${index}`}>
                      <td>
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleString('th-TH')
                          : item.time}
                      </td>
                      <td>{Number(item.temperature).toFixed(1)} °C</td>
                      <td>{Number(item.humidity).toFixed(1)} %RH</td>
                      <td>{Number(item.etoMmPerDay).toFixed(1)} mm/วัน</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="storage-empty">
                      ไม่พบข้อมูลเซนเซอร์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        ) : (

          /* ตารางประวัติปั๊มน้ำ */
          <div className="storage-table-wrap">
            <table className="storage-table">
              <thead>
                <tr>
                  <th>เวลาเริ่ม</th>
                  <th>เวลาปิด</th>
                  <th>สถานะ</th>
                  <th><Clock3 size={14} /> ระยะเวลาทำงาน</th>
                </tr>
              </thead>

              <tbody>
                {filteredPumps.length > 0 ? (
                  filteredPumps.map((log) => (
                    <tr key={log.id}>
                      <td>
                        {new Date(log.startedAt).toLocaleString('th-TH')}
                      </td>
                      <td>
                        {log.stoppedAt
                          ? new Date(log.stoppedAt).toLocaleString('th-TH')
                          : 'กำลังทำงาน'}
                      </td>
                      <td>
                        <span className={log.stoppedAt ? 'storage-status-off' : 'storage-status-on'}>
                          {log.stoppedAt ? 'OFF' : 'ON'}
                        </span>
                      </td>
                      <td>
                        {log.durationSeconds !== null
                          ? `${log.durationSeconds} วินาที`
                          : 'กำลังทำงาน'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="storage-empty">
                      ไม่พบประวัติปั๊มน้ำ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        )}

      </section>

      {/* หมายเหตุ */}
      <div className="page-footnote">
        AgriFlow Data Storage
        <span>·</span>
        ระบบจัดเก็บข้อมูลสำหรับต้นแบบ IoT
      </div>

    </div>
  );
}
