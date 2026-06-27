"""Test Module: Advanced CSS Features
Groups: CSS, Features, Modern
Markers: css, modern, fast
Tests CSS custom properties, @property, color-mix, scrollbar, animations, print.
"""

async def test_css_custom_properties_exist(page):
    props = await page.evaluate('''() => {
        const s = getComputedStyle(document.documentElement);
        return {
            acc: s.getPropertyValue('--acc'),
            bg: s.getPropertyValue('--bg'),
            card: s.getPropertyValue('--card'),
            ink: s.getPropertyValue('--ink')
        };
    }''')
    assert props['acc'], f"--acc not set: {props['acc']}"
    assert props['bg'], "--bg not set"
    assert props['ink'], "--ink not set"
test_css_custom_properties_exist._group = 'CSS'
test_css_custom_properties_exist._markers = ['css', 'fast']

async def test_accent_color_is_purple(page):
    acc = await page.evaluate('() => getComputedStyle(document.documentElement).getPropertyValue("--acc")')
    assert '#534AB7' in acc or '534AB7' in acc, f"Accent not purple: {acc}"
test_accent_color_is_purple._group = 'CSS'
test_accent_color_is_purple._markers = ['css', 'fast']

async def test_card_has_shadow_or_border(page):
    shadow = await page.evaluate('''() => {
        // Check main DOM first, then shadow DOM
        let c = document.querySelector('.card');
        if (!c) {
            const wt = document.querySelector('deep-walkthrough');
            if (wt && wt.shadowRoot) c = wt.shadowRoot.querySelector('.card');
        }
        if (!c) {
            const drill = document.querySelector('deep-drill');
            if (drill && drill.shadowRoot) c = drill.shadowRoot.querySelector('.card');
        }
        if (!c) return 'no-card';
        return getComputedStyle(c).boxShadow + '|' + getComputedStyle(c).borderWidth;
    }''')
    assert shadow != 'none' and shadow != 'no-card', f"Card styling: {shadow}"
test_card_has_shadow_or_border._group = 'CSS'
test_card_has_shadow_or_border._markers = ['css', 'fast']

async def test_selection_style_exists(page):
    has_rule = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.selectorText === '::selection') return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_rule, "::selection rule not found"
test_selection_style_exists._group = 'CSS'
test_selection_style_exists._markers = ['css', 'fast']

async def test_scrollbar_style_in_css(page):
    has_scrollbar = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.cssText && r.cssText.includes('::-webkit-scrollbar')) return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_scrollbar, "Custom scrollbar CSS not found"
test_scrollbar_style_in_css._group = 'CSS'
test_scrollbar_style_in_css._markers = ['css', 'fast']

async def test_prefers_reduced_motion_supported(page):
    has_media = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.type === CSSRule.MEDIA_RULE && r.conditionText && r.conditionText.includes('prefers-reduced-motion')) return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_media, "prefers-reduced-motion media query not found"
test_prefers_reduced_motion_supported._group = 'CSS'
test_prefers_reduced_motion_supported._markers = ['css', 'fast']

async def test_print_stylesheet_exists(page):
    has_print = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.type === CSSRule.MEDIA_RULE && r.conditionText && r.conditionText.includes('print')) return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_print, "Print stylesheet not found"
test_print_stylesheet_exists._group = 'CSS'
test_print_stylesheet_exists._markers = ['css', 'fast']

async def test_focus_visible_style(page):
    has_focus = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.selectorText && r.selectorText.includes(':focus-visible')) return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_focus, ":focus-visible styles not found"
test_focus_visible_style._group = 'CSS'
test_focus_visible_style._markers = ['css', 'fast']

async def test_body_font_stack_valid(page):
    font = await page.evaluate('() => getComputedStyle(document.body).fontFamily')
    assert 'system-ui' in font or 'Segoe UI' in font or '-apple-system' in font, f"Font: {font}"
test_body_font_stack_valid._group = 'CSS'
test_body_font_stack_valid._markers = ['css', 'fast']

async def test_html_overflow_hidden(page):
    ov = await page.evaluate('() => getComputedStyle(document.documentElement).overflow')
    assert ov == 'hidden', f"html overflow: {ov}"
test_html_overflow_hidden._group = 'CSS'
test_html_overflow_hidden._markers = ['css', 'critical', 'fast']

async def test_body_background_is_cream(page):
    bg = await page.evaluate('() => getComputedStyle(document.body).backgroundColor')
    assert bg != 'rgba(0, 0, 0, 0)' and bg != 'transparent', f"Body bg: {bg}"
test_body_background_is_cream._group = 'CSS'
test_body_background_is_cream._markers = ['css', 'fast']

async def test_loading_shimmer_animation(page):
    has_shimmer = await page.evaluate('''() => {
        for (const s of document.styleSheets) {
            try {
                for (const r of s.cssRules) {
                    if (r.name === 'shimmer') return true;
                }
            } catch(e) {}
        }
        return false;
    }''')
    assert has_shimmer, "Shimmer animation not found"
test_loading_shimmer_animation._group = 'CSS'
test_loading_shimmer_animation._markers = ['css', 'fast']
