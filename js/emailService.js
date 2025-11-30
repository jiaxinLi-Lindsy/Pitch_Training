/**
 * Email Service Module - 使用 EmailJS 发送实验结果
 * 
 * 使用说明：
 * 1. 在 EmailJS 官网 (https://www.emailjs.com/) 注册账户
 * 2. 创建邮件服务（如 Gmail）
 * 3. 创建邮件模板
 * 4. 获取 Service ID, Template ID 和 Public Key
 * 5. 在 emailConfig.js 中配置这些参数
 */

// EmailJS 配置（从 emailConfig.js 导入）
let emailConfig = {
    serviceId: 'service_exe9d5a',        // 替换为您的 EmailJS Service ID
    templateId: 'template_4c3g3ss',      // 替换为您的 EmailJS Template ID
    publicKey: 'zCRuIOysDOYJWbovr'        // 替换为您的 EmailJS Public Key
};

/**
 * 初始化 EmailJS 配置
 * @param {Object} config - 配置对象
 */
function initEmailService(config) {
    if (config) {
        emailConfig = { ...emailConfig, ...config };
    }
    
    // 初始化 EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(emailConfig.publicKey);
        console.log('[EmailService] EmailJS initialized successfully');
        console.log('[EmailService] Public Key:', emailConfig.publicKey);
    } else {
        console.error('[EmailService] EmailJS library not loaded');
    }
}

// 自动初始化（当页面加载完成时）
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        if (typeof EMAIL_CONFIG !== 'undefined') {
            initEmailService(EMAIL_CONFIG);
        } else {
            // 如果EMAIL_CONFIG还未加载，使用默认配置初始化
            if (typeof emailjs !== 'undefined') {
                emailjs.init(emailConfig.publicKey);
                console.log('[EmailService] EmailJS initialized with default config');
            }
        }
    });
}

/**
 * （已弃用）生成 CSV 内容 - 现在直接使用实验页面的CSV生成函数
 * 保留此函数以保持向后兼容
 */
function generateCSVContent(trialRecords, results, experimentInfo) {
    // 这个函数已被弃用，现在使用实验页面的 generateCSVContentForEmail() 函数
    console.warn('[EmailService] generateCSVContent() is deprecated. Use experiment page generateCSVContentForEmail() instead.');
    return '';
}


/**
 * 将 CSV 内容转换为 Base64 编码（用于附件）
 * @param {string} csvContent - CSV 内容字符串
 * @returns {string} Base64 编码的字符串
 */
function csvToBase64(csvContent) {
    // 使用 UTF-8 BOM 确保中文正确显示
    const BOM = '\uFEFF';
    const contentWithBOM = BOM + csvContent;
    return btoa(unescape(encodeURIComponent(contentWithBOM)));
}

/**
 * 发送实验结果邮件（带 CSV 附件）
 * @param {Object} params - 参数对象
 * @param {string} params.csvContent - CSV内容字符串（从实验页面生成）
 * @param {Object} params.experimentInfo - 实验信息
 * @param {string} params.experimentInfo.startTime - 实验开始时间
 * @param {string} params.experimentInfo.completionDate - 实验完成时间
 * @param {string} params.experimentInfo.participantId - 被试ID
 * @param {string} params.experimentInfo.sessionNumber - 训练场次
 * @param {Function} params.onSuccess - 成功回调函数
 * @param {Function} params.onError - 错误回调函数
 */
function sendExperimentResults(params) {
    const {
        csvContent = '',
        experimentInfo = {},
        onSuccess = null,
        onError = null
    } = params;
    
    console.log('[EmailService] Preparing to send email...');
    
    // 检查 EmailJS 是否已加载
    if (typeof emailjs === 'undefined') {
        const errorMsg = 'EmailJS library not loaded. Please include EmailJS script in your HTML.';
        console.error('[EmailService]', errorMsg);
        if (onError) onError(new Error(errorMsg));
        return;
    }
    
    // 直接使用传入的CSV内容（已包含被试信息）
    const csvBase64 = csvToBase64(csvContent);
    
    // 生成文件名（格式：Session-ParticipantID-ExperimentName）
    const participantId = experimentInfo.participantId || 'Unknown';
    const sessionNumber = experimentInfo.sessionNumber || 'Unknown';
    const experimentType = (experimentInfo.type || 'Pitch_Training').replace(/\s+/g, '_').replace(/[()]/g, '');
    const fileName = `Session${sessionNumber}_${participantId}_${experimentType}.csv`;
    
    // 准备邮件参数
    const templateParams = {
        participant_id: experimentInfo.participantId || 'N/A',
        session_number: experimentInfo.sessionNumber || 'N/A',
        experiment_type: experimentInfo.type || 'Pitch Training Experiment',
        start_time: experimentInfo.startTime || 'N/A',
        completion_date: experimentInfo.completionDate || new Date().toLocaleString('zh-CN'),
        total_trials: experimentInfo.totalTrials || 'N/A',
        total_reversals: experimentInfo.totalReversals || 'N/A',
        jnd_value: experimentInfo.jndValue || 'N/A',
        accuracy: experimentInfo.accuracy || 'N/A',
        mean_rt: experimentInfo.meanRT || 'N/A',
        attachment_name: fileName,
        attachment_content: csvBase64,
        // 添加简短的结果摘要
        results_summary: experimentInfo.resultsSummary || 'See attached CSV file for detailed results.'
    };
    
    console.log('[EmailService] Sending email with parameters:', {
        experimentType: templateParams.experiment_type,
        fileName: fileName
    });
    
    // 发送邮件
    emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        templateParams
    )
    .then(function(response) {
        console.log('[EmailService] Email sent successfully!', response.status, response.text);
        if (onSuccess) {
            onSuccess(response);
        }
    })
    .catch(function(error) {
        console.error('[EmailService] Failed to send email:', error);
        if (onError) {
            onError(error);
        }
    });
}

/**
 * 快速发送函数 - 调用实验页面的CSV生成函数
 * 此函数假设实验页面中已定义 generateCSVContentForEmail() 函数
 */
function sendCurrentExperimentResults() {
    console.log('[EmailService] Starting to send current experiment results...');
    
    // 检查实验页面是否定义了CSV生成函数
    if (typeof window.generateCSVContentForEmail !== 'function') {
        console.error('[EmailService] generateCSVContentForEmail() function not found in experiment page');
        alert('錯誤：實驗頁面未定義CSV生成函數。請檢查實驗頁面代碼。');
        return;
    }
    
    // 调用实验页面的CSV生成函数
    const csvContent = window.generateCSVContentForEmail();
    
    if (!csvContent) {
        console.error('[EmailService] CSV content is empty');
        alert('錯誤：無法生成CSV內容。');
        return;
    }
    
    // 获取被试ID和训练场次
    const participantId = getParticipantId();
    const sessionNumber = getSessionNumber();
    
    // 获取实验信息
    const experimentInfo = {
        participantId: participantId,
        sessionNumber: sessionNumber,
        type: document.querySelector('.training-info')?.textContent || 'Pitch Training',
        startTime: window.experimentStartTime || localStorage.getItem('experimentStartTime') || 'N/A',
        completionDate: new Date().toLocaleString('zh-CN'),
        totalTrials: window.numberOfIterations || 'N/A',
        totalReversals: window.NumberOfReversals || 'N/A',
        accuracy: calculateAccuracyForEmail(),
        meanRT: calculateMeanRTForEmail(),
        jndValue: window.jndAbsoluteDifference ? window.jndAbsoluteDifference.toFixed(2) + ' ms' : 'N/A',
        resultsSummary: generateQuickSummary()
    };
    
    console.log('[EmailService] Sending email with experiment info:', {
        participantId: experimentInfo.participantId,
        sessionNumber: experimentInfo.sessionNumber,
        experimentType: experimentInfo.type
    });
    
    sendExperimentResults({
        csvContent: csvContent,
        experimentInfo: experimentInfo,
        onSuccess: function(response) {
            alert('实验结果已成功发送到指定邮箱！');
            
            // 检查是否需要跳转到下一个实验
            checkAndNavigateToNextExperiment();
        },
        onError: function(error) {
            alert('发送邮件失败：' + error.message + '\n请检查网络连接或联系管理员。');
        }
    });
}

/**
 * 生成快速摘要
 */
function generateQuickSummary() {
    let summary = '';
    
    if (window.jndAbsoluteDifference !== undefined) {
        summary += `JND: ${window.jndAbsoluteDifference.toFixed(2)} ms\n`;
    }
    
    if (window.trialRecords && window.trialRecords.length > 0) {
        const accuracy = calculateAccuracyForEmail();
        const meanRT = calculateMeanRTForEmail();
        summary += `Accuracy: ${accuracy}\n`;
        summary += `Mean RT: ${meanRT}\n`;
    }
    
    return summary || 'See attached CSV file for detailed results.';
}

/**
 * 检查并跳转到下一个实验
 * 如果有下一个实验，跳转到该实验页面
 * 如果是最后一个实验，显示完成提示并返回首页
 */
function checkAndNavigateToNextExperiment() {
    // 从localStorage获取实验序列信息
    const experimentSequence = JSON.parse(localStorage.getItem('experimentSequence') || '[]');
    const experimentFiles = JSON.parse(localStorage.getItem('experimentFiles') || '[]');
    const currentIndex = parseInt(localStorage.getItem('currentExperimentIndex') || '0');
    const participantId = localStorage.getItem('participantId') || '';
    const sessionNumber = localStorage.getItem('sessionNumber') || '';
    
    // 检查是否在实验序列中
    if (experimentSequence.length === 0 || experimentFiles.length === 0) {
        console.log('[Navigation] No experiment sequence found, staying on current page');
        return;
    }
    
    // 计算下一个实验的索引
    const nextIndex = currentIndex + 1;
    
    console.log(`[Navigation] Current index: ${currentIndex}, Total experiments: ${experimentSequence.length}`);
    
    // 检查是否还有下一个实验
    if (nextIndex < experimentSequence.length) {
        // 还有下一个实验
        const nextExperimentFileIndex = experimentSequence[nextIndex];
        const nextExperimentFile = experimentFiles[nextExperimentFileIndex];
        
        console.log(`[Navigation] Moving to next experiment: ${nextExperimentFile}`);
        
        // 更新当前实验索引
        localStorage.setItem('currentExperimentIndex', nextIndex.toString());
        
        // 延迟1秒后跳转，让用户看到成功消息
        setTimeout(function() {
            window.location.href = nextExperimentFile + 
                '?participantId=' + encodeURIComponent(participantId) +
                '&sessionNumber=' + encodeURIComponent(sessionNumber) +
                '&sequenceIndex=' + nextIndex;
        }, 1500);
        
    } else {
        // 所有实验已完成
        console.log('[Navigation] All experiments completed!');
        
        // 清理localStorage中的实验序列信息
        localStorage.removeItem('experimentSequence');
        localStorage.removeItem('experimentFiles');
        localStorage.removeItem('currentExperimentIndex');
        
        // 显示完成消息并返回首页
        setTimeout(function() {
            alert('🎉 恭喜！您已完成所有实验！\n\n感谢您的参与！');
            window.location.href = 'index.html';
        }, 1500);
    }
}

/**
 * 辅助函数：计算准确率（用于邮件）
 */
function calculateAccuracyForEmail() {
    if (!window.trialRecords || window.trialRecords.length === 0) {
        return 'N/A';
    }
    
    const correct = window.trialRecords.filter(t => t.isCorrect).length;
    const total = window.trialRecords.length;
    const percentage = (correct / total * 100).toFixed(1);
    
    return `${percentage}% (${correct}/${total})`;
}

/**
 * 辅助函数：计算平均反应时间（用于邮件）
 */
function calculateMeanRTForEmail() {
    if (!window.trialRecords || window.trialRecords.length === 0) {
        return 'N/A';
    }
    
    const allRTs = window.trialRecords.map(t => parseFloat(t.reactionTime));
    const mean = allRTs.reduce((a, b) => a + b, 0) / allRTs.length;
    
    return mean.toFixed(0) + ' ms';
}

/**
 * 辅助函数：获取被试ID
 * 优先从URL参数获取，其次从localStorage获取
 */
function getParticipantId() {
    // 从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    let participantId = urlParams.get('participantId');
    
    // 如果URL中没有，尝试从localStorage获取
    if (!participantId) {
        participantId = localStorage.getItem('participantId');
    }
    
    // 如果获取到了，保存到localStorage（用于页面刷新后保持）
    if (participantId) {
        localStorage.setItem('participantId', participantId);
    }
    
    return participantId || 'Unknown';
}

/**
 * 辅助函数：获取训练场次
 * 优先从URL参数获取，其次从localStorage获取
 */
function getSessionNumber() {
    // 从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    let sessionNumber = urlParams.get('sessionNumber');
    
    // 如果URL中没有，尝试从localStorage获取
    if (!sessionNumber) {
        sessionNumber = localStorage.getItem('sessionNumber');
    }
    
    // 如果获取到了，保存到localStorage（用于页面刷新后保持）
    if (sessionNumber) {
        localStorage.setItem('sessionNumber', sessionNumber);
    }
    
    return sessionNumber || 'Unknown';
}

// 导出函数（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initEmailService,
        sendExperimentResults,
        sendCurrentExperimentResults,
        generateCSVContent
    };
}
