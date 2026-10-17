// Trong runAllContentTick, state 'flow':
if (BH.allState === 'flow') {
    const map = BH.ACTIVITY_MAP[currentActivity];
    const templateId = (map && map.templateId) ? map.templateId : currentActivity;
    const template = BH.getTemplate(templateId);

    if (!template) {
        BH.setMsg('⚠ Không có template cho ' + currentActivity);
        BH.allState = 'next';
        return;
    }

    const flowHandler = BH.FLOW_TYPES[template.flow.type];
    if (!flowHandler) {
        BH.allState = 'next';
        return;
    }

    const options = BH.loadTemplateOptions(templateId);
    const clickDelay = options.clickDelay || template.defaultClickDelay || 500;

    flowHandler(template, function (step) {
        const stepHandler = BH.STEP_TYPES[step.type || 'click'];
        if (!stepHandler) return;
        stepHandler.action(step, clickDelay);
    });

    // Next khi ở màn chính liên tục 10s
    if (BH.detectScreen() === 'main') {
        if (!BH._mainDetectedAt) {
            BH._mainDetectedAt = BH.rt.now();
        } else if (BH.rt.now() - BH._mainDetectedAt > 10000) {
            BH._mainDetectedAt = 0;
            BH.allState = 'next';
        }
    } else {
        BH._mainDetectedAt = 0;
    }
    return;
}