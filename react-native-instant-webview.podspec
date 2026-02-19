require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-instant-webview"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["repository"]["url"]
  s.license      = package["license"]
  s.authors      = { "wooBottle" => "wooBottle" }

  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => package["repository"]["url"], :tag => s.version }

  s.source_files = "ios/**/*.{h,mm}"

  # install_modules_dependencies (RN >= 0.71) handles both Old and New Architecture
  # dependencies including React-Core, TurboModule headers, Fabric, and codegen.
  # For RN < 0.71, fall back to React-Core dependency only.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
