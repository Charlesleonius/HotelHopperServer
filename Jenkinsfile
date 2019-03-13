pipeline {
  agent {
    label 'slave'
  }
  stages {
    stage('Install Dependencies') {
      steps {
        nodejs('HotelHopper') {
          sh '''
                npm install
                npm run test-jenkins
            '''
        }

      }
    }
    stage('Run Tests') {
      steps {
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
  environment {
    HOME = '.'
    PSQL_URI = 'postgresql://localhost:5432/hotel_hopper'
  }
}