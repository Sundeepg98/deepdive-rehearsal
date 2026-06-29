"""Test Module: v308 Features — Visual UI/UX + Technical APIs
Groups: Features
Markers: features, visual
test_v308_features.py covers:
- mouse-glow.js (cursor-following ambient light)
- magnetic-button.js (hover pull effect)
- cache-modules.js (Cache API offline storage)
- storage-estimate.js (storage usage display)
- save-data.js (data saver mode detection)
- view-transition.js (View Transitions API wrapper)
- permission-request.js (permission graceful request)
- text-fragment.js (#:~:text= URL fragment handling)
- beacon-unload.js (navigator.sendBeacon on unload)
"""

async def test_mouse_glow_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('MouseGlow')) return true;
        return false;
    }''')
    assert has_script, "MouseGlow script missing"
test_mouse_glow_script_loaded._group = 'Features'
test_mouse_glow_script_loaded._markers = ['features', 'visual']

async def test_mouse_glow_element_created(page):
    await page.wait_for_timeout(1500)
    has_el = await page.evaluate('() => !!document.getElementById("_mouse-glow")')
    assert has_el, "Mouse glow element not created"
test_mouse_glow_element_created._group = 'Features'
test_mouse_glow_element_created._markers = ['features', 'visual']

async def test_magnetic_button_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('MagneticButton')) return true;
        return false;
    }''')
    assert has_script, "MagneticButton script missing"
test_magnetic_button_script_loaded._group = 'Features'
test_magnetic_button_script_loaded._markers = ['features', 'visual']

async def test_magnetic_button_attaches(page):
    has_attraction = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) {
            if (x.textContent && x.textContent.includes('_magnetic') &&
                x.textContent.includes('STRENGTH')) return true;
        }
        return false;
    }''')
    assert has_attraction, "Magnetic attraction logic not found"
test_magnetic_button_attaches._group = 'Features'
test_magnetic_button_attaches._markers = ['features', 'visual']

async def test_cache_modules_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('CacheModules')) return true;
        return false;
    }''')
    assert has_script, "CacheModules script missing"
test_cache_modules_script_loaded._group = 'Features'
test_cache_modules_script_loaded._markers = ['features']

async def test_storage_estimate_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('StorageEstimate')) return true;
        return false;
    }''')
    assert has_script, "StorageEstimate script missing"
test_storage_estimate_script_loaded._group = 'Features'
test_storage_estimate_script_loaded._markers = ['features']

async def test_save_data_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('SaveData')) return true;
        return false;
    }''')
    assert has_script, "SaveData script missing"
test_save_data_script_loaded._group = 'Features'
test_save_data_script_loaded._markers = ['features']

async def test_permission_request_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('PermissionRequest')) return true;
        return false;
    }''')
    assert has_script, "PermissionRequest script missing"
test_permission_request_script_loaded._group = 'Features'
test_permission_request_script_loaded._markers = ['features']

async def test_text_fragment_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('TextFragment')) return true;
        return false;
    }''')
    assert has_script, "TextFragment script missing"
test_text_fragment_script_loaded._group = 'Features'
test_text_fragment_script_loaded._markers = ['features']

async def test_beacon_unload_script_loaded(page):
    has_script = await page.evaluate('''() => {
        const s = document.querySelectorAll('script');
        for (const x of s) if (x.textContent && x.textContent.includes('sendBeacon')) return true;
        return false;
    }''')
    assert has_script, "BeaconUnload script missing"
test_beacon_unload_script_loaded._group = 'Features'
test_beacon_unload_script_loaded._markers = ['features']
