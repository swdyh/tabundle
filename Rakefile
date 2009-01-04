require 'rexml/document'
require 'digest/sha1'
require 'rake/clean'

include REXML
include FileUtils::Verbose

CLEAN.include ['*.xpi']

EXTENSION_NAME = 'tabundle'
XPI_URL        = 'http://www.relucks.org/tabundle/tabundle.xpi'
PROFILE_DIR    = '/Users/youhei/Library/Application Support/Firefox/Profiles/e2gtwgy4.development'
MCCOY_DIR      = '/Users/youhei/Library/Application\ Support/McCoy/Profiles/977xwbo1.default'
NSS_SIGN_DATA  = '/Applications/Firefox3.app/Contents/MacOS/nss_sign_data'

desc "create the xpi file and use the version number in the file name"
task :xpi do
  FileUtils.rm_rf Dir.glob('*.xpi')
  file = xpi_filename
  sh "zip -qr -9 #{file} *"
  puts "create #{file}"
end

desc "install to local profile directory"
task :install => [:clean, :uninstall] do
  install_path = "#{PROFILE_DIR}/extensions/#{extension_id}"
  FileUtils.cp_r Dir.pwd, install_path
  puts "copy #{install_path}"
end

desc "uninstall from local profile directory"
task :uninstall do
  install_path = "#{PROFILE_DIR}/extensions/#{extension_id}"
  FileUtils.rm_rf install_path
  puts "remove #{install_path}"
end

desc "update update.rdf"
task :update_rdf => :xpi do
  update_update_rdf
  puts 'update update.rdf'
  # sign_update_rdf
  # puts 'sign update.rdf'
end

desc "deploy xpi and update.rdf"
task :deploy do
  system "scp update.rdf tabundle.xpi  relucks.org:www/default/tabundle/"
end

task :default => :xpi

def extension_id
  open('install.rdf','r') do |file|
    install_rdf_xmldoc = Document.new(file)
    install_rdf_xmldoc.elements.each('RDF/Description/em:id') do |element|
      return element.text
    end
  end
end

def version_number
  open('install.rdf') do |f|
    install_rdf_xmldoc = Document.new(f.read)
    install_rdf_xmldoc.elements.each('RDF/Description/em:version') do |element|
      return element.text
    end
  end
end

def xpi_filename
  "#{EXTENSION_NAME}.xpi"
end

def update_update_rdf
  source = IO.read 'update.rdf'
  source.sub!(/(em:version)="[^"]+"/, %(\\1="#{version_number}"))
  source.sub!(/(em:updateHash)="[^"]+"/, %(\\1="#{xpi_hash}"))
  source.sub!(/(em:updateLink)="[^"]+"/, %(\\1="#{XPI_URL}"))
  open('update.rdf', 'w') { |f| f.puts source }
end

def xpi_hash
  'sha1:' + Digest::SHA1.hexdigest(open(xpi_filename).read)
end

def sign_update_rdf
  source = IO.read 'update.rdf'
  source.sub!(/(em:signature)="[^"]+"/, %(\\1="#{sign}"))
  open('update.rdf', 'w') { |f| f.puts source }
end

# not working
def sign
  # http://ido.nu/kuma/2008/02/22/signing-firefox3-extension-updaterdf-with-spock/
  `cat update.rdf | #{NSS_SIGN_DATA} #{MCCOY_DIR}`.strip
end
