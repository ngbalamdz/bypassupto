// ==UserScript==
// @name         Auto Bypass Uptolink - HuongDanGetLink
// @namespace    https://huongdangetlink.com/
// @version      1.0.0
// @description  Tự động bypass các bước chờ trên uptolink.one khi dùng qua huongdangetlink.com
// @author       Auto
// @match        https://huongdangetlink.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      uptolink.one
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ===================== UI STYLES =====================
    GM_addStyle(`
        #bypass-panel {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            width: 320px;
            background: #0d0d0d;
            border: 1px solid #2a2a2a;
            border-radius: 14px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #e0e0e0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            overflow: hidden;
        }
        #bypass-header {
            background: #161616;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #2a2a2a;
        }
        #bypass-header span {
            font-weight: bold;
            color: #00ff88;
            font-size: 14px;
            letter-spacing: 0.05em;
        }
        #bypass-close {
            cursor: pointer;
            color: #666;
            font-size: 18px;
            line-height: 1;
            transition: color 0.2s;
        }
        #bypass-close:hover { color: #fff; }
        #bypass-body {
            padding: 14px 16px;
        }
        #bypass-status {
            margin-bottom: 10px;
            color: #aaa;
            min-height: 20px;
        }
        #bypass-status.ok { color: #00ff88; }
        #bypass-status.err { color: #ff4d4d; }
        #bypass-status.info { color: #7eb8ff; }
        #bypass-bar-wrap {
            background: #1e1e1e;
            border-radius: 6px;
            height: 6px;
            overflow: hidden;
            margin-bottom: 12px;
        }
        #bypass-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #00ff88, #00c2ff);
            border-radius: 6px;
            transition: width 0.4s ease;
        }
        #bypass-log {
            background: #111;
            border-radius: 8px;
            padding: 8px 10px;
            height: 100px;
            overflow-y: auto;
            font-size: 11px;
            color: #555;
            line-height: 1.6;
            border: 1px solid #1e1e1e;
        }
        #bypass-log .log-ok { color: #00cc66; }
        #bypass-log .log-err { color: #ff6b6b; }
        #bypass-log .log-info { color: #5ba8ff; }
        #bypass-btn {
            margin-top: 12px;
            width: 100%;
            padding: 9px;
            background: #00ff88;
            color: #000;
            font-family: inherit;
            font-size: 13px;
            font-weight: bold;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s, transform 0.1s;
            letter-spacing: 0.05em;
        }
        #bypass-btn:hover { background: #00e07a; }
        #bypass-btn:active { transform: scale(0.98); }
        #bypass-btn:disabled { background: #333; color: #666; cursor: not-allowed; }
        #bypass-result {
            margin-top: 10px;
            word-break: break-all;
            display: none;
        }
        #bypass-result a {
            color: #00ff88;
            text-decoration: underline;
        }
        #bypass-input {
            width: 100%;
            box-sizing: border-box;
            background: #111;
            border: 1px solid #2a2a2a;
            border-radius: 8px;
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 8px 10px;
            margin-bottom: 10px;
            outline: none;
            transition: border-color 0.2s;
        }
        #bypass-input:focus { border-color: #00ff88; }
    `);

    // ===================== UI ELEMENTS =====================
    const panel = document.createElement('div');
    panel.id = 'bypass-panel';
    panel.innerHTML = `
        <div id="bypass-header">
            <span>⚡ UPTOLINK BYPASS</span>
            <span id="bypass-close">✕</span>
        </div>
        <div id="bypass-body">
            <input id="bypass-input" type="text" placeholder="Nhập URL trang gốc (Referer)..." />
            <div id="bypass-status" class="info">Sẵn sàng...</div>
            <div id="bypass-bar-wrap"><div id="bypass-bar"></div></div>
            <div id="bypass-log"></div>
            <button id="bypass-btn">▶ BẮT ĐẦU BYPASS</button>
            <div id="bypass-result"></div>
        </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('bypass-close').onclick = () => panel.remove();

    const statusEl = document.getElementById('bypass-status');
    const barEl = document.getElementById('bypass-bar');
    const logEl = document.getElementById('bypass-log');
    const btn = document.getElementById('bypass-btn');
    const resultEl = document.getElementById('bypass-result');

    function setStatus(msg, type = 'info') {
        statusEl.textContent = msg;
        statusEl.className = type;
    }

    function addLog(msg, type = 'info') {
        const line = document.createElement('div');
        line.className = `log-${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function setBar(pct) {
        barEl.style.width = Math.min(100, pct) + '%';
    }


    function gmFetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: options.method || 'GET',
                url,
                headers: options.headers || {},
                data: options.body || null,
                onload: (res) => resolve({ text: res.responseText, status: res.status }),
                onerror: (err) => reject(err),
            });
        });
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function getReferer() {
        // Lấy referer từ trang huongdangetlink.com hoặc trang hiện tại
        return document.referrer || window.location.href;
    }

    async function doBySpass() {
        btn.disabled = true;
        resultEl.style.display = 'none';
        resultEl.innerHTML = '';
        setBar(5);

        const inputEl = document.getElementById('bypass-input');
        const refererUrl = inputEl.value.trim() || document.referrer || window.location.href;

        if (!refererUrl) {
            setStatus('Vui lòng nhập URL trang gốc!', 'err');
            btn.disabled = false;
            return;
        }

        addLog(`Referer: ${refererUrl}`, 'info');

        const originMatch = refererUrl.match(/https?:\/\/[^/]+/);
        const origin = originMatch ? originMatch[0] : 'https://huongdangetlink.com';

        // ---- BƯỚC 1: Lấy Token ----
        setStatus('Đang lấy token...', 'info');
        addLog('Đang fetch jsconfig.js...', 'info');

        let token;
        try {
            const res = await gmFetch('https://uptolink.one/statics/jsconfig.js', {
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
                    'referer': refererUrl,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0'
                }
            });

            const match = res.text.match(/var\s+rd\s*=\s*"([^"]+)"/);
            if (!match) {
                addLog('Không tìm thấy token!', 'err');
                setStatus('Lỗi: Không lấy được token', 'err');
                btn.disabled = false;
                return;
            }
            token = match[1];
            addLog(`Token: ${token.substring(0, 20)}...`, 'ok');
            setBar(15);
        } catch (e) {
            addLog(`Lỗi fetch jsconfig: ${e}`, 'err');
            setStatus('Lỗi kết nối', 'err');
            btn.disabled = false;
            return;
        }

        // ---- BƯỚC 2: Bypass Loop ----
        const payload = 'screen=1366%20x%20768&browser%5Bname%5D=Chrome&browser%5Bversion%5D=145.0.0.0&browser%5BmajorVersion%5D=145&os%5Bname%5D=Windows&os%5Bversion%5D=10.0&mobile=false&cookies=true';

        const postHeaders = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
            'content-type': 'application/x-www-form-urlencoded',
            'content-value-random': token,
            'origin': origin,
            'referer': refererUrl,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0'
        };

        let step = 0;
        const MAX_STEPS = 10;

        while (step < MAX_STEPS) {
            // Check Job
            setStatus(`[Step ${step + 1}] Đang kiểm tra job...`, 'info');
            addLog('Gọi /check/job...', 'info');

            let jobData;
            try {
                const res = await gmFetch('https://uptolink.one/check/job', {
                    method: 'POST',
                    headers: postHeaders,
                    body: payload
                });
                jobData = JSON.parse(res.text);
            } catch (e) {
                addLog(`Lỗi /check/job: ${e}`, 'err');
                setStatus('Lỗi kết nối job', 'err');
                break;
            }

            if (jobData.status !== 'success') {
                addLog(`Job lỗi: ${JSON.stringify(jobData)}`, 'err');
                setStatus('Lỗi job', 'err');
                break;
            }

            const waitTime = jobData.wait || 0;
            const currentStep = jobData.step || step + 1;
            addLog(`Step ${currentStep}: chờ ${waitTime}s`, 'info');
            setBar(20 + step * 15);

            // Countdown
            try {
                const res = await gmFetch('https://uptolink.one/check/countdown', {
                    method: 'POST',
                    headers: postHeaders,
                    body: payload
                });
                const cd = JSON.parse(res.text);
                if (cd.status !== 'success') {
                    addLog('Lỗi kích hoạt countdown!', 'err');
                    break;
                }
                addLog('Countdown kích hoạt thành công', 'ok');
            } catch (e) {
                addLog(`Lỗi /check/countdown: ${e}`, 'err');
                break;
            }

            // Chờ
            for (let i = waitTime; i > 0; i--) {
                setStatus(`⏳ [Step ${currentStep}] Đang chờ ${i}s...`, 'info');
                await sleep(1000);
            }
            await sleep(1000); // buffer

            addLog('Gọi /check/continue...', 'info');

            // Continue
            let contData;
            try {
                const res = await gmFetch('https://uptolink.one/check/continue', {
                    method: 'POST',
                    headers: postHeaders,
                    body: payload
                });
                contData = JSON.parse(res.text);
            } catch (e) {
                addLog(`Lỗi /check/continue: ${e}`, 'err');
                break;
            }

            if (contData.status === 'finish') {
                setBar(100);
                setStatus('🎉 HOÀN THÀNH! Đang chuyển hướng...', 'ok');
                addLog(`Finish URL: ${contData.url}`, 'ok');

                resultEl.style.display = 'block';
                resultEl.innerHTML = `🔗 <a href="${contData.url}" target="_blank" rel="noopener noreferrer">Mở thủ công nếu không tự chuyển</a>`;

                // POST đến /finish/... bằng form submit (giữ nguyên cookie)
                setTimeout(() => {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = contData.url;
                    form.style.display = 'none';
                    document.body.appendChild(form);
                    form.submit();
                }, 1000);

                btn.disabled = false;
                return;
            } else if (contData.status === 'success') {
                addLog(`Xong Step ${currentStep}, tiếp tục...`, 'ok');
                step++;
            } else {
                addLog(`Lỗi continue: ${JSON.stringify(contData)}`, 'err');
                setStatus('Lỗi continue', 'err');
                break;
            }
        }

        setStatus('Đã dừng', 'err');
        btn.disabled = false;
    }

    btn.addEventListener('click', doBySpass);

    // Tự động điền referer nếu đang ở huongdangetlink.com
    const inputEl = document.getElementById('bypass-input');
    if (window.location.hostname.includes('huongdangetlink.com')) {
        inputEl.value = window.location.href;
        addLog('Đã tự điền URL trang hiện tại làm Referer.', 'info');
    }

    // Tự động chạy nếu đang ở trang uptolink.one
    if (window.location.hostname === 'uptolink.one') {
        inputEl.value = document.referrer || 'https://huongdangetlink.com/';
        addLog('Phát hiện trang uptolink.one, tự động chạy...', 'info');
        setTimeout(doBySpass, 1500);
    } else {
        addLog('Nhập URL trang gốc rồi bấm nút để bypass.', 'info');
    }

})();
