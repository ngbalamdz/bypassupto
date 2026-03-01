// ==UserScript==
// @name         Auto Uptolink (V21.0 - Native Referer Bounce)
// @namespace    http://tampermonkey.net/
// @version      21.0
// @description  Bypass Up-to-link - owner PhatNotTaken
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      uptolink.one
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const hostName = window.location.hostname;

    if (urlParams.has('redirect_to_upto')) {
        const finishUrl = decodeURIComponent(urlParams.get('redirect_to_upto'));
        document.body.innerHTML = `
            <div style="background:#000; color:#0f0; height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace; font-size: 24px;">
                <h2>ĐANG ÉP REFERER TỰ NHIÊN...</h2>
                <p style="color:yellow">Nguồn gửi đi: ${hostName}</p>
                <p>Đang phóng thẳng vào Link đích...</p>
            </div>`;

        setTimeout(() => { window.location.href = finishUrl; }, 1000);
        return;
    }

    if (!hostName.includes('huongdangetlink.com')) return;

    let consoleContainer = document.createElement('div');
    consoleContainer.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; width: 500px; height: 380px;
        background: #1e1e1e; color: #cccccc; font-family: 'Consolas', 'Courier New', monospace;
        font-size: 13px; border: 1px solid #333333; border-radius: 8px;
        z-index: 2147483647; box-shadow: 0 4px 15px rgba(0,0,0,0.7);
        display: flex; flex-direction: column; overflow: hidden;
    `;

    let titleBar = document.createElement('div');
    titleBar.style.cssText = `
        background: #2d2d2d; color: #888; padding: 5px 10px; font-size: 12px;
        border-bottom: 1px solid #111; display: flex; justify-content: space-between;
    `;
    titleBar.innerHTML = `<span>root@uptolink-bot:~</span><span>V21.0_Native_Bounce</span>`;
    consoleContainer.appendChild(titleBar);

    let logArea = document.createElement('div');
    logArea.style.cssText = `flex-grow: 1; padding: 10px; overflow-y: auto; line-height: 1.5;`;
    consoleContainer.appendChild(logArea);

    let inputArea = document.createElement('div');
    inputArea.style.cssText = `padding: 10px; border-top: 1px dotted #444; display: flex; align-items: center;`;

    let prefix = document.createElement('span');
    prefix.style.color = "#4CAF50";
    prefix.innerText = "Target_URL:~$ ";

    let inputField = document.createElement('input');
    inputField.type = "text";
    inputField.placeholder = "Dán link referer vào đây (VD: https://789win-mobi.com/)...";
    inputField.style.cssText = `
        flex-grow: 1; background: transparent; border: none; color: #fff;
        font-family: 'Consolas', monospace; font-size: 13px; outline: none; margin-left: 5px;
    `;

    inputArea.appendChild(prefix);
    inputArea.appendChild(inputField);
    consoleContainer.appendChild(inputArea);
    document.body.appendChild(consoleContainer);

    function logMsg(msg, type = "info") {
        let color = "#cccccc";
        if (type === "success") color = "#4CAF50";
        if (type === "error") color = "#f44336";
        if (type === "warn") color = "#ffeb3b";
        if (type === "system") color = "#2196F3";

        let newLine = document.createElement('div');
        newLine.innerHTML = `<span style="color:#569cd6;">~</span> <span style="color:${color}">${msg}</span>`;
        logArea.appendChild(newLine);
        logArea.scrollTop = logArea.scrollHeight;
    }

    logMsg("System Ready...", "system");
    logMsg("Nhập URL gốc (Referer) và nhấn Enter để bẻ khóa.", "warn");

    inputField.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            let targetUrl = inputField.value.trim();
            if (targetUrl && targetUrl.startsWith("http")) {
                inputField.disabled = true;
                inputField.style.color = "#888";
                logMsg(`Mục tiêu xác nhận: ${targetUrl}`, "success");
                autoBypass(targetUrl);
            } else {
                logMsg("URL không hợp lệ!", "error");
            }
        }
    });

    let globalSessionCookies = "";
    const fakeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0";

    function getOrigin(url) {
        try { return new URL(url).origin; } catch(e) { return url; }
    }

    function autoBypass(refererUrl) {
        logMsg("Đang lấy Token và Cookie...");

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://uptolink.one/statics/jsconfig.js",
            headers: {
                "accept": "*/*",
                "referer": refererUrl,
                "user-agent": fakeUserAgent
            },
            onload: function(res) {
                let headers = res.responseHeaders.split('\n');
                headers.forEach(h => {
                    if (h.toLowerCase().startsWith('set-cookie:')) {
                        globalSessionCookies += h.substring(11).split(';')[0].trim() + "; ";
                    }
                });

                const match = res.responseText.match(/var\s+rd\s*=\s*"([^"]+)"/);
                if (!match) return logMsg("Không lấy được token!", "error");

                logMsg(`Lấy Token: ${match[1].substring(0, 10)}...`, "success");
                runStep(match[1], refererUrl);
            }
        });
    }

    function runStep(token, refererUrl) {
        const originUrl = getOrigin(refererUrl);
        const payload = "screen=1366%20x%20768&browser%5Bname%5D=Chrome&browser%5Bversion%5D=145.0.0.0&browser%5BmajorVersion%5D=145&os%5Bname%5D=Windows&os%5Bversion%5D=10.0&mobile=false&cookies=true";

        let headersPost = {
            "accept": "*/*",
            "content-type": "application/x-www-form-urlencoded",
            "content-value-random": token,
            "origin": originUrl,
            "referer": refererUrl,
            "user-agent": fakeUserAgent
        };

        if (globalSessionCookies !== "") headersPost["cookie"] = globalSessionCookies;

        GM_xmlhttpRequest({
            method: "POST",
            url: "https://uptolink.one/check/job",
            data: payload,
            headers: headersPost,
            onload: function(resJob) {
                let jobData = JSON.parse(resJob.responseText);
                if(jobData.status !== "success") return logMsg(`Lỗi job: ${resJob.responseText}`, "error");

                let waitTime = jobData.wait || 0;
                logMsg(`[Step ${jobData.step || '?'}] Chờ ${waitTime} giây...`, "system");

                GM_xmlhttpRequest({ method: "POST", url: "https://uptolink.one/check/countdown", data: payload, headers: headersPost });

                let counter = waitTime;
                let cdInterval = setInterval(() => {
                    let lastLog = logArea.lastChild;
                    lastLog.innerHTML = `<span style="color:#569cd6;">~</span> <span style="color:#cccccc">Đang đợi: <span style="color:#ffeb3b">${counter}s</span></span>`;
                    counter--;

                    if (counter < 0) {
                        clearInterval(cdInterval);

                        setTimeout(() => {
                            GM_xmlhttpRequest({
                                method: "POST",
                                url: "https://uptolink.one/check/continue",
                                data: payload,
                                headers: headersPost,
                                onload: function(resCont) {
                                    let contData = JSON.parse(resCont.responseText);

                                    if (contData.status === "finish") {
                                        logMsg("🎉 BẺ KHÓA THÀNH CÔNG!", "success");
                                        logMsg(`Thấy link đích: ${contData.url}`, "warn");
                                        logMsg("Mượn xác web gốc để trình duyệt tự gắn Header...", "warn");

                                        let bounceUrl = originUrl + "/?redirect_to_upto=" + encodeURIComponent(contData.url);
                                        setTimeout(() => { window.location.href = bounceUrl; }, 1000);

                                    } else if (contData.status === "success") {
                                        logMsg(`-> Sang vòng tiếp theo...`, "success");
                                        runStep(token, refererUrl);
                                    } else {
                                        logMsg(`Lỗi Continue: ${resCont.responseText}`, "error");
                                    }
                                }
                            });
                        }, 1000);
                    }
                }, 1000);
            }
        });
    }

})();
