import urllib.request

html_str = '''
<html><body style="margin:0; width:100%; height:100%; overflow:hidden; background: black;">
<div id="app" style="display:flex; height:100%; width:100%; overflow-y:auto; overflow-x:hidden;">
<div id="sidebar" style="width:280px; flex-shrink:0; background:purple;"></div>
<div id="content" style="flex:1; display:flex; flex-direction:column; min-width:0; max-width:100vw; background:red; height:2000px;">
  <div id="header" style="height:70px; background:blue;"></div>
</div>
</div>
</body></html>
'''
with open('test.html', 'w') as f:
    f.write(html_str)
